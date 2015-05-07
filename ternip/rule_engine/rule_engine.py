#!/usr/bin/env python

from collections import defaultdict
from glob import glob
import imp
import os.path

class RuleEngine(object):
    """
    A base class for rule engines to use
    """

    _block_type = None

    def __init__(self):
        self._rules = []
        self.num_rules = 0

    def load_rules(self, path):
        """
        Do rule loading. Loads all files ending in .pyrule as 'complex' rules
        (direct Python code), .rule using the documented rule format, and
        .ruleblock as blocks which contain sequences of rules.
        For direct Python code, the rule must be a class called 'rule'.
        
        Throws rule_load_errors containing errors for all rules that failed to
        load.
        """

        errors = []

        # First load simple rules
        for filename in glob(os.path.join(path, '*.rule')):
            # don't bail out after one load failure, load them all and report
            # all at once
            with open(filename) as fd:
                try:
                    self._rules.append(self._load_rule(filename, fd.readlines()))
                    self.num_rules += 1
                except RuleLoadError as e:
                    errors.append(e)

        # Then rule blocks
        for file in glob(os.path.join(path, '*.ruleblock')):
            try:
                self._rules.append(self._load_block(file))
                self.num_rules += len(self._rules[-1]._rules)
            except RuleLoadError as e:
                errors.append(e)
            except RuleLoadErrors as e:
                for error in e.errors:
                    errors.append(e)

        # Then complex rules
        for file in glob(os.path.join(path, '*.pyrule')):
            (dir, modname) = os.path.split(file)
            modname = modname[:-7]
            self._rules.append(imp.load_source(modname, file).rule())
            self.num_rules += 1

        # Now, check the rule's we've just loaded for consistency
        try:
            self._check_rule_consistency()
        except RuleLoadErrors as e:
            for error in e.errors:
                errors.append(e)

        # Bulk raise any errors that occurred
        if len(errors) > 0:
            raise RuleLoadErrors(errors)

    def load_rule(self, filename):
        """
        Load a rule, then check for consistency
        
        Throws rule_load_error if a rule fails to load
        """
        self._rules.append(self._load_rule(filename))
        self._check_rule_consistency()

    def load_block(self, filename):
        """
        Load a block of rules, then check for consistency
        Throws rule_load_errors if a rule fails to load
        """
        self._rules.append(self._load_block(filename))
        self._check_rule_consistency()

    def _load_block(self, filename):
        """ Load a block of rules """

        errors = []

        # split the files up until rules, separated by '---'
        with open(filename) as fd:
            parts = []
            part = []
            for line in fd:
                if line.startswith('---'):
                    parts.append(part)
                    part = []
                else:
                    part.append(line)
            parts.append(part)

        header = parts[0]
        parts = parts[1:]
        rules = []

        # First block is considered to be the header
        header = self._parse_rule(filename, header)

        # Defaults
        block_type = None
        id = filename
        after = []

        for key in header:
            # 'Block-Type' is a compulsory field with limited acceptable values
            if key == 'block-type':
                if (len(header[key]) != 1):
                    raise RuleLoadError(filename, "There must be exactly 1 'Block-Type' field")
                else:
                    type = header[key][0].lower()
                    if type == 'run-all':
                        type = 'all'
                    elif type == 'run-until-success':
                        type = 'until-success'
                    else:
                        errors.append(
                            RuleLoadError(filename, "Only 'run-all' or 'run-until-success' are valid block types"))

            # ID is an optional field, which can only exist once
            elif key == 'id':
                if (len(header[key]) == 1):
                    id = header[key][0]
                elif (len(header[key]) > 1):
                    errors.append(RuleLoadError(filename, "Too many 'ID' fields"))

            # After takes multiple, optional values
            elif key == 'after':
                after = header[key]

            # Reject anything else
            else:
                errors.append(RuleLoadError(filename, "Key '" + key + "' is not valid in a block header"))

        # Now load all other parts
        i = 0
        for part in parts:
            i += 1
            try:
                rules.append(self._load_rule(filename + ":" + str(i), part))
            except RuleLoadError as e:
                errors.append(e)

        # ID and After are invalid in individual rules
        for rule in rules:
            if rule.id[:len(filename)] != filename:
                errors.append(
                    RuleLoadError(filename, "'ID' fields are invalid outside of the block header in a rule block"))
            if len(rule.after) > 0:
                errors.append(
                    RuleLoadError(filename, "'After' fields are invalid outside of the block header in a rule block"))

        if len(errors) > 0:
            raise RuleLoadErrors(errors)
        else:
            return self._block_type(id, header['after'], type, rules)

    def _check_rule_consistency(self):
        """ Check that the rules are internally consistent """

        errors = []

        # First, get all rule IDs and then all IDs mentioned as after IDs
        rule_ids = dict()
        for rule in self._rules:
            if rule.id in rule_ids:
                errors.append(RuleLoadError(rule.id, 'Duplicate ID!'))
            else:
                rule_ids[rule.id] = rule

        # Now check each referred to after ID exists
        for rule in self._rules:
            circular_check = True
            for after in rule.after:
                if after not in rule_ids:
                    errors.append(RuleLoadError(rule.id, 'Reference made to non-existant rule'))
                    # If this happens, don't check for circular references, as
                    # there are dangling references and it causes errors
                    circular_check = False

            # and check each rule for any circular references
            if circular_check and self._circular_check(rule.id, rule, rule_ids):
                errors.append(RuleLoadError(rule.id, 'Circular dependency - rule must run after itself'))

        # Bulk raise any errors that occurred
        if len(errors) > 0:
            raise RuleLoadErrors(errors)

    def _parse_rule(self, filename, rulelines):
        """
        Private function that takes the lines of a 'simple' rule file, parses
        the key/value pairs, and then returns them as a dictionary. Does no kind
        of type or validity checking, and assumes that everything can have
        multiple values. It's then the caller's responsibility to check what
        gets returned.
        """

        d = defaultdict(list)

        for line in rulelines:
            # ignore empty lines and comments
            if line.rstrip() != '' and not line.startswith('#'):
                try:
                    [key, value] = line.split(':', 1)
                except ValueError:
                    raise RuleLoadError(filename, 'Malformed key-value pair on line: ' + line.rstrip())
                d[key.lower()].append(value.strip())

        return d

    def _circular_check(self, search_for, rule, rule_ids):
        """ Check for any circular references """
        if search_for in rule.after:
            return True
        else:
            for after in rule.after:
                res = self._circular_check(search_for, rule_ids[after], rule_ids)
                if res:
                    return True
            return False


class RuleLoadError(Exception):
    """
    Error for when a rule fails to load
    """

    def __init__(self, filename, errorstr):
        self._filename = filename
        self._errorstr = errorstr

    def __str__(self):
        return 'Error when loading rule ' + self._filename + ': ' + self._errorstr


class RuleLoadErrors(Exception):
    """
    Error which bundles multiple rule_load_errors together. Allows for delayed
    exit on multiple load errors.
    """

    def __init__(self, errors):
        self.errors = errors

    def __str__(self):
        return '\n'.join([str(error) for error in self.errors])
