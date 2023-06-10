# Change Log
I didn't do this from the start unfortunately... so lots of decisions and their reasoning will forever be forgotten. All release notes pre v0.5 are written about 8 years after they actually happened. But better late than never, right?

## v0.6 - 2023-06-10
### Fixed
- The [Natural Language Toolkit (NLTK)](https://www.nltk.org/) is back to working! The problem was that one of the tagger data sets (averaged_perceptron_tagger) was missing. Thanks ChatGPT for your support.
- Python Upgrade cleanups. There were still some remaining code issues that came through the Python 2 to 3 upgrade. 

## v0.5 - 2023-02-19
After many years of not working on it, I noticed that [TimeLineCurator](http://timelinecurator.org/) wasn't working anymore :(  
This was because [Heroku](http://heroku.com/) (where the App is hosted) doesn't do free anymore (fair enough) and it also stopped supporting Python 2 code.
So if I want to keep TLC alive I will have to:
- Start paying for Heroku
- Update the Python version (and all the other packages as well - I guess)
- Fix all the broken things that come with package updates and major Python version jumps. Fun!

## v0.4 - 2015-06-11
### Improvements
- Added labels with event title on hover inside Timeline View
- Minor style changes in text input

## v0.3 - 2015-05-29
### Improvements
The first community contribution from [@joshuarrrr](https://github.com/joshuarrrr). I remember having been very excited about this!!  
@joshuarrrr added the functionality to scrape and parse article urls!
 
## v0.2 - 2015-05-27
### Improvements
- Add the MIT license
- Style changes for Control Panel and fix for selecting active track

## v0.1 - 2015-05-06
### Initial commit
:rocket: