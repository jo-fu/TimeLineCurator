#!/usr/bin/env python

import calendar
import datetime
import dateutil.easter
import re

from ternip.rule_engine.normalisation_functions.string_conversions import *
from ternip.rule_engine.normalisation_functions.words_to_num import *
from ternip.rule_engine import expressions


def normalise_two_digit_year(y):
    """
    Given a year string, which could be 2 digits, try and get a 4 digit year
    out of it as a string
    """
    if y[0] == "'":
        y = y[1:]
    if int(y) < 39:
        return '%04d' % (int(y) + 2000)
    elif int(y) < 100:
        return '%04d' % (int(y) + 1900)
    else:
        return '%04d' % int(y[:4])


def easter_date(y):
    """
    Return the date of Easter for that year as a string
    """
    return dateutil.easter.easter(int(y)).strftime('%Y%m%d')


def date_to_week(y, m, d):
    """
    Convert a date into a week number string, with year
    """
    return datetime.datetime(y, m, d).strftime(r'%YW%W')


def date_to_dow(y, m, d):
    """
    Gets the integer day of week for a date. Sunday is 0.
    """
    # Python uses Monday week start, so wrap around
    w = calendar.weekday(y, m, d) + 1
    if w == 7:
        w = 0
    return w


def nth_dow_to_day((m, dow, n), y):
    """
    Figures out the day of the nth day-of-week in the month m and year y as an
    integer

    e.g., 2nd Wednesday in July 2010:
          nth_dow_to_day((7, 3, 2), 2010)

    Conversion from GUTime
    """

    if dow == 7:
        dow = 0

    first_dow = date_to_dow(y, m, 1)  # the dow of the first of the month
    shift = dow - first_dow
    if shift < 0:
        shift += 7

    return shift + (7 * n) - 6


def date_to_iso(string):
    """
    A translation of GUTime's Date2ISO function. Given some date/time string
    representing an absolute date, then return a date string in the basic ISO
    format.
    """

    # disregard tokenisation, if it's there, to make this an easier conversion for GUTime
    string = re.sub(r'<([^~]*)~.+?>', r'\1 ', string)

    # Defaults
    d = None
    m = None
    y = None
    h = None
    min = None
    s = None
    fs = None
    zone = None

    # ACE format
    match = re.search(r'(\d\d\d\d\d\d\d\d:\d\d\d\d)', re.sub('\s', '', string))
    if match is not None:
        d = match.group(1)
        d = re.sub(r':', r'T', d)
        return d

    # Already in ISO format
    match = re.search(r'(\d\d\d\d-?\d\d-?\d\d)(-?(T\d\d(:?\d\d)?(:?\d\d)?([+-]\d{1,4})?))?', re.sub('\s', '', string))
    if match is not None:
        d = match.group(1)
        d = re.sub(r'-', r'', d)
        h = match.group(3)
        if h is not None:
            h = re.sub(r':', r'', h)
            return d + h
        else:
            return d

    # some pre-processing
    match = re.search('T\d\d(:?\d\d)?(:?\d\d)?([+-]\d{1,4})?', re.sub('\s', '', string))
    if match is not None:
        return re.sub(r':', r'', re.sub('\s', '', string))

    # extract date
    if re.search(
        r'(\d\d?|' + expressions.ORDINAL_WORDS + r'|' + expressions.ORDINAL_NUMS + r')\s+'
        r'(' + expressions.MONTHS + r'|' + expressions.MONTH_ABBRS + r'\s*\.?)\s*,?\s+(\d\d(\s|\Z)|\d{4}\b)',
        string, re.I) is not None:
        match = re.search(
            r'(\d\d?|' + expressions.ORDINAL_WORDS + r'|' + expressions.ORDINAL_NUMS + r')\s+'
            r'(' + expressions.MONTHS + r'|' + expressions.MONTH_ABBRS + r'\s*\.?)\s*,?\s+(\d\d(\s|\Z)|\d{4}\b)',
            string, re.I)
        d = ordinal_to_num(match.group(1))
        m = month_to_num(match.group(5))
        y = match.group(7)

    elif re.search(
        r'(' + expressions.MONTHS + r'|' + expressions.MONTH_ABBRS + r'\s*\.?)\s+'
        r'(\d\d?|' + expressions.ORDINAL_WORDS + r'|' + expressions.ORDINAL_NUMS + r')\b,?\s*(\d\d(\s|\Z)|\d{4}\b)',
        string, re.I) is not None:
        match = re.search(
            r'(' + expressions.MONTHS + r'|' + expressions.MONTH_ABBRS + r'\s*\.?)\s+'
            r'(\d\d?|' + expressions.ORDINAL_WORDS + r'|' + expressions.ORDINAL_NUMS + r')\b,?\s*(\d\d(\s|\Z)|\d{4}\b)',
            string, re.I)
        d = ordinal_to_num(match.group(4))
        m = month_to_num(match.group(1))
        y = match.group(7)

    elif re.search(r'(\d\d\d\d)(\/|\-)(\d\d?)\2(\d\d?)', re.sub('\s', '', string)) is not None:
        match = re.search(r'(\d\d\d\d)(\/|\-)(\d\d?)\2(\d\d?)', re.sub('\s', '', string))
        m = match.group(3)
        d = match.group(4)
        y = match.group(1)

    elif re.search(r'(\d\d?)(\/|\-|\.)(\d\d?)\2(\d\d(\d\d)?)', re.sub('\s', '', string)) is not None:
        match = re.search(r'(\d\d?)(\/|\-|\.)(\d\d?)\2(\d\d(\d\d)?)', re.sub('\s', '', string))
        m = match.group(1)
        d = match.group(3)
        y = match.group(4)

    if y is not None:
        # check for European style date
        if 12 < int(m) <= 31 and int(d) <= 12:
            new_d = m
            m = d
            d = new_d

        # check for 2 digit year
        y = normalise_two_digit_year(str(y))

        iso = "%4d%02d%02d" % (int(y), int(m), int(d))

    else:
        iso = "XXXXXXXX"

    # Extract time
    match = re.search(r'(\d?\d):(\d\d)(:(\d\d)(\.\d+)?)?(([AP])\.?M\.?)?(([+\-]\d+|[A-Z][SD]T|GMT([+\-]\d+)?))?',
        re.sub('\s', '', string), re.I)
    if match is not None:
        h = match.group(1)
        min = match.group(2)
        s = match.group(4)
        fs = match.group(5)
        ampm = match.group(7)
        zone = match.group(9)

        if ampm is not None and ampm[0].lower() == 'p':
            h = str(int(h) + 12)

        if zone is not None:
            zm = re.search(r'(GMT)([+\-]\d+)', zone)
            if zm is not None:
                zone = zm.group(2)
            elif zone.lower().find('gmt') > -1:
                zone = 'Z'
            elif re.search(r'([A-Z])([SD])T', zone) is not None:
                zm = re.search(r'([A-Z])([SD])T', zone)
                # Timezone offsets from GMT
                timezones = {
                    "R": 1,
                    "E": -5,
                    "C": -6,
                    "M": -7,
                    "P": -8
                }
                if zm.group(1).upper() in timezones:
                    zone = timezones[zm.group(1).upper()]
                    if zm.group(2).lower() == 'd':
                        zone += 1
                    if zone < 0:
                        zone = '-%02d00' % (-1 * zone)
                    else:
                        zone = '+%02d00' % zone
    elif re.search(r'(\d\d)(\d\d)\s+(h(ou)?rs?|(on\s+)?\d\d?\/\d)', string, re.I) is not None:
        match = re.search(r'(\d\d)(\d\d)\s+(h(ou)?rs?|(on\s+)?\d\d?\/\d)', string, re.I)
        h = match.group(1)
        min = match.group(2)

    if h is not None:
        if fs is not None:
            fs = re.sub(r'\.', r'', fs)
            iso += 'T%02d%02d%02d.%02d' % (int(h), int(min), int(s), int(fs))
        elif s is not None:
            iso += 'T%02d%02d%02d' % (int(h), int(min), int(s))
        elif min is not None:
            iso += 'T%02d%02d' % (int(h), int(min))

        if zone is not None:
            iso += zone.lstrip()

    return iso


def extract_timezone(string):
    """
    Given some string, try and extract the timezone it refers to. Returns a
    string.
    """

    tz = ''

    # detokenise if need be
    string = re.sub(r'<([^~]*)~[^>]*>', r'\1 ', string)

    match = re.search(r'(\d|\b)([A-Z][SD]T)\b', string)
    if match is not None:
        tz = match.group(2)

    elif string.lower().find('universal') > -1:
        tz = 'UT'

    elif string.lower().find('zulu') > -1:
        tz = 'GMT'

    elif re.search(r'([a-z])[a-z]+\s+([ds])[a-z]+\s+time', string, re.I) is not None:
        match = re.search(r'([a-z])[a-z]+\s+([ds])[a-z]+\s+time', string, re.I)
        tz = match.group(1).upper() + match.group(2).upper() + 'T'

    return tz


def convert_to_24_hours(time, ap):
    """
    Given a hour and an a/p specifier, then convert the hour into 24 hour clock
    if need be
    """
    if ap.lower() == 'p' and time <= 12:
        time += 12

    return time
