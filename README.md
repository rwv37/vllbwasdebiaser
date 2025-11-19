# Vestertopian Learned League BWA Search Debiaser

This is a [Greasemonkey](https://www.greasespot.net/) script intended to help [Learned League](https://learnedleague.com/)'s "Best Wrong Answer Searchers" by removing certain sources of implicit bias that arise based on the design of the pages that they use to search for their BWA recommendations.

The source code for the script (and related stuff like this document itself) can be found at:

https://github.com/rwv37/vllbwasdebiaser

# Bias #1: Answers are always listed in lexicographical order

On a BWA search page for a specific match day and question, the answers given by LLamas are each shown on a single line along with a checkbox. A BWA Searcher can select any number of answers to suggest for consideration as a BWA. There are often many different answers given for any particular question (sometimes literally over a thousand).

The order in which they are presented to the BWA Searchers therefore can be important: With so many to look through, a Searcher may just stop looking through the list at some point. Assuming that a significant number of Searchers start at the top and go down from there, this will introduce a bias for the BWA recommendations towards those at the top of the list. Since the list is presented to the Searchers in lexicographical order, this means a bias towards (for example) "AMAZING ANSWER" and away from "ZINGER ANSWER".

The script attempts to mitigate this by randomly shuffling the order in which the answers are presented.

Note that the script only does this after the page has been fully loaded, so if you have a slow internet connection (or I guess maybe if there are a whole lot of answers) you may sometimes still initially see the list in lexicographical order. It should shuffle pretty quickly thereafter, though.

# Bias #2: The index of links to search pages is ordered

The main BWA search page shows an index of links to all of the BWA search pages for individual match day/question pairs. This index is presented to BWA Searchers as a table, with rows being match days and columns being question numbers. These rows and columns are each ordered in the natural way. This seems to result in a slight tendency for (e.g.) question #1 of any given match day being given more eyes than question #6 of that same match day. It may also give a bias in terms of match day, but I suspect that any such bias is overwhelmed by a tendency for Searchers to get a bit more tired of searching as the season progresses.

The script does _not_ reorder the table of links, since it's convenient for a Searcher who, for whatever reason, wants to look at the answers given by Llamas for a specific question. However, it attempts to mitigate these issues by inserting a link to a "Random unhandled question" just above the table.

# Possible future enhancements

## Sort/shuffle on demand

As of the time of this writing, the script will _always_ shuffle the answers presented on a given match day/question pair's search page. If you have the script installed but for some specific case you want to see them in lexicographical order, you can do so by disabling the script (from the Greasemonkey menu) and refreshing the page, but it might be nice if the script were to provide a button to sort/shuffle on demand.

## Settings/options

Currently, you can have any color of Vestertopian Learned League BWA Search Debiaser you want, as long as it's black. It might be nice to have settings/otions for some things; for example, if the above idea of adding a sort/shuffle button were implemented, it would be nice to be able to choose which of sorting and shuffling is the default.

## Support for BWA Voting

At the end of each season, LLamas can vote for the actual Best Wrong Answer. This is _not_ limited to BWA Searchers. Rather, throughout the season, BWA Searchers make suggestions to the Commissioner, [Thorsten A. Integrity](https://learnedleague.com/thorsten/aboutthorsten.php), for answers that they think might be worthy of BWA consideration. Thorsten then creates a final list of answers that LLamas in general can choose from when voting for the actual BWA. Presumably, the creation of this list takes into account the suggestions made throughout the season by the BWA Searchers.

This final list also has a potential source of bias: It is presented to the LLamas in order of match day and question number. Although this script is currently intended to mitigate bias related to the selections made by BWA Searchers throughout the season, it might be nice to expand it to also try to mitigate this bias in the actual final vote, too.

# Further info

These sources of bias (and others) have been discussed in threads on the Learned League forums. Here are a couple links to such threads:

- [Biasing of BWA candidates](https://learnedleague.com/viewtopic.php?f=3&t=18511) (2022/10/01)
- [Strategies for choosing this season's BWAs?](https://learnedleague.com/viewtopic.php?f=16&t=18968) (2022/11/08)

# Hail Vestertopia!

Hail Vestertopia!
