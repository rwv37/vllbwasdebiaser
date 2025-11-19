//////////////////////////////////////////////////////////////////////////////
// HAIL VESTERTOPIA!
//
// This is the Vestertopian Learned League BWA Search Debiaser, which is a
// Greasemonkey script to help Learned League's "best wrong answer" searchers
// make their BWA suggestions with less implicit bias resulting from the base
// BWA search functionality of the site.
//
// If this makes no sense at all to you, you probably will not find this
// script to be terribly useful.
//
// If it makes some sense, but not enough, you may or may not find the further
// information that is available on the script's source code repository to be
// useful:
//
// https://github.com/rwv37/vllbwasdebiaser
//
//////////////////////////////////////////////////////////////////////////////

/*****************************************************************************
MIT License

Copyright (c) 2025 Robert William Vesterman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*****************************************************************************/

// ==UserScript==
// @name     Vestertopian Learned League BWA Search Debiaser
// @include  /^https?://learnedleague\.com/bwasearch\.php\??/
// @version  1.0.0
// @grant    none
// @run-at   document-end
// ==/UserScript==

'use strict';

//////////////////////////////////////////////////////////////////////////////
// \function "Main()"
//
// The main entry point for the extension
//////////////////////////////////////////////////////////////////////////////
function Main() {
  Logger.Info(
    `${GM.info.script.name} starting up; version ${GM.info.script.version}`
  );

  PageHandlerRouter.Route();
}

//////////////////////////////////////////////////////////////////////////////
// \class "DomQuerist"
//
// Syntactic sugar for querying the DOM with an expected range of results in
// mind.
//
// Various public functions exist, the basic one being ExpectRange(), which
// requires specification of a minimum and a maximum. The others are just
// more syntactic sugar on top of that; for example, ExpectOne() just winds
// up calling ExpectRange (perhaps not directly), specifying both the minimum
// and maximum as 1.
//
// If the actual number of results does not match expectations, an error is
// thrown. Assuming the results match expectations:
//
// If the expected range includes any number greater than one, the result is
// a NodeList (just like that of the standard querySelectorAll()). Again,
// note that this is based on the EXPECTED RANGE, not on the actual results.
// Otherwise (i.e. the range is either exactly zero, zero to one, or exactly
// one):
//
// If there is exactly one result, that result is returned.
//
// If there are zero results, null is returned.
//
// All public functions include an optional "purposeText" param that is
// intended to allow error messages to be a bit more specific and helpful. For
// example, without specifying a purposeText, an error message might be
// something like:
//
//   DomQuerist expected 0 to 2 results; got 5
//
// But with a purposeText of "Finding blings in the thingamajig", the same
// error might instead give the message:
//
//   DomQuerist expected 0 to 2 results; got 5; Purpose: Finding blings in the thingamajig
//////////////////////////////////////////////////////////////////////////////
class DomQuerist {
  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectAnything"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectAnything(from, selectors, purposeText = null) {
    return this.ExpectRange(
      from,
      selectors,
      0,
      Number.POSITIVE_INFINITY,
      purposeText
    );
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectAtLeast"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectAtLeast(from, selectors, minimum, purposeText = null) {
    return this.ExpectRange(
      from,
      selectors,
      minimum,
      Number.POSITIVE_INFINITY,
      purposeText
    );
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectAtMost"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectAtMost(from, selectors, maximum, purposeText = null) {
    return this.ExpectRange(from, selectors, 0, maximum, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectExactly"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectExactly(from, selectors, expected, purposeText = null) {
    return this.ExpectRange(from, selectors, expected, expected, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectOne"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectOne(from, selectors, purposeText = null) {
    return this.ExpectExactly(from, selectors, 1, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectOneOrMore"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectOneOrMore(from, selectors, purposeText = null) {
    return this.ExpectAtLeast(from, selectors, 1, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectOneOrTwo"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectOneOrTwo(from, selectors, purposeText = null) {
    return this.ExpectRange(from, selectors, 1, 2, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectRange"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectRange(from, selectors, minimum, maximum, purposeText = null) {
    this.#_AssertRangeValid(minimum, maximum, purposeText);

    const results = from.querySelectorAll(selectors);
    this.#_AssertResultsInRange(results, minimum, maximum, purposeText);

    if (1 < maximum) {
      return results;
    }

    if (results.length === 0) {
      return null;
    }

    return results[0];
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.ExpectZeroOrOne"
  ////////////////////////////////////////////////////////////////////////////
  static ExpectZeroOrOne(from, selectors, purposeText = null) {
    return this.ExpectAtMost(from, selectors, 1, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.#_AssertRangeValid"
  ////////////////////////////////////////////////////////////////////////////
  static #_AssertRangeValid(minimum, maximum, purposeText) {
    this.#_AssertLimitValid(minimum, 'minimum', purposeText);
    this.#_AssertLimitValid(maximum, 'maximum', purposeText);
    this.#_AssertLimitsMutuallySensible(minimum, maximum, purposeText);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.#_AssertLimitValid"
  // We only accept two sorts of things: Either (A) a non-negative integer or
  // (B) positive infinity.
  ////////////////////////////////////////////////////////////////////////////
  static #_AssertLimitValid(limit, limitText, purposeText) {
    if (Number.isInteger(limit)) {
      if (limit < 0) {
        this.#_ThrowError(
          `cannot use negative ${limitText} of ${limit}`,
          purposeText
        );
      }

      return;
    }

    if (limit !== Number.POSITIVE_INFINITY) {
      this.#_ThrowError(
        `cannot use non-integer ${limitText} of ${limit}`,
        purposeText
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.#_AssertLimitsMutuallySensible"
  ////////////////////////////////////////////////////////////////////////////
  static #_AssertLimitsMutuallySensible(minimum, maximum, purposeText) {
    if (maximum < minimum) {
      this.#_ThrowError(
        `cannot use invalid range ${minimum} to ${maximum}`,
        purposeText
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.#_AssertResultsInRange"
  ////////////////////////////////////////////////////////////////////////////
  static #_AssertResultsInRange(results, minimum, maximum, purposeText) {
    const length = results.length;
    if (length < minimum || maximum < length) {
      this.#_ThrowError(
        `expected ${minimum} to ${maximum} results; got ${length}`,
        purposeText
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "DomQuerist.#_ThrowError"
  ////////////////////////////////////////////////////////////////////////////
  static #_ThrowError(mainText, purposeText) {
    const addendum = IsNullishOrBlank(purposeText)
      ? ''
      : `; Purpose: ${purposeText}`;
    Logger.ErrorAndThrow(`DomQuerist ${mainText}${addendum}`);
  }
}

//////////////////////////////////////////////////////////////////////////////
// \function "ElementIs"
//
// Return true or false based on whether or not the specified element has the
// specified tag type.
//////////////////////////////////////////////////////////////////////////////
function ElementIs(element, tag) {
  if (IsNullish(element)) {
    return false;
  }

  return element.tagName.toLowerCase() === tag.toLowerCase();
}

//////////////////////////////////////////////////////////////////////////////
// \function "GetElementAs"
//
// Get the specified element as the specified tag type.
//
// Returns null if this cannot be done (e.g. it's not the correct type).
//////////////////////////////////////////////////////////////////////////////
function GetElementAs(element, tag) {
  return ElementIs(element, tag) ? element : null;
}

//////////////////////////////////////////////////////////////////////////////
// \function "GetElementAsAnchor"
//
// Get the specified element as an anchor (i.e. an "a" element).
//
// Returns null if this cannot be done (e.g. it's not the correct type).
//////////////////////////////////////////////////////////////////////////////
function GetElementAsAnchor(element) {
  return GetElementAs(element, 'a');
}

//////////////////////////////////////////////////////////////////////////////
// \function "GetElementAsBr"
//
// Get the specified element as a "br" element.
//
// Returns null if this cannot be done (e.g. it's not the correct type).
//////////////////////////////////////////////////////////////////////////////
function GetElementAsBr(element) {
  return GetElementAs(element, 'br');
}

//////////////////////////////////////////////////////////////////////////////
// \function "GetElementAsLabel"
//
// Get the specified element as a "label" element.
//
// Returns null if this cannot be done (e.g. it's not the correct type).
//////////////////////////////////////////////////////////////////////////////
function GetElementAsLabel(element) {
  return GetElementAs(element, 'label');
}

//////////////////////////////////////////////////////////////////////////////
// \function "IsBlank"
//
// Check if the specified value is, when represented as a string, empty or
// all whitespace.
//////////////////////////////////////////////////////////////////////////////
function IsBlank(something) {
  const asString = something.toString();
  const trimmed = asString.trim();

  return trimmed.length === 0;
}

//////////////////////////////////////////////////////////////////////////////
// \function "IsNotNullish"
//
// Check if the specified value is not nullish, as per the definition from the
// documentation:
//
//    https://developer.mozilla.org/en-US/docs/Glossary/Nullish
//////////////////////////////////////////////////////////////////////////////
function IsNotNullish(something) {
  return !IsNullish(something);
}

//////////////////////////////////////////////////////////////////////////////
// \function "IsNullish"
//
// Check if the specified value is nullish, as per the definition from the
// documentation:
//
//    https://developer.mozilla.org/en-US/docs/Glossary/Nullish
//////////////////////////////////////////////////////////////////////////////
function IsNullish(something) {
  return something === null || something === undefined;
}

//////////////////////////////////////////////////////////////////////////////
// \function "IsNullishOrBlank"
//
// Check if the specified value is nullish or, if a string, blank (i.e. empty
// or all whitespace).
//////////////////////////////////////////////////////////////////////////////
function IsNullishOrBlank(something) {
  if (IsNullish(something)) {
    return true;
  }

  return IsBlank(something);
}

//////////////////////////////////////////////////////////////////////////////
// \class "Logger"
//
// Logging stuff.
//////////////////////////////////////////////////////////////////////////////
class Logger {
  static #_LOG_LEVEL_TRACE = 0;
  static #_LOG_LEVEL_DEBUG = 1;
  static #_LOG_LEVEL_INFO = 2;
  static #_LOG_LEVEL_WARNING = 3;
  static #_LOG_LEVEL_ERROR = 4;
  static #_LOG_LEVEL_SILENT = Number.MAX_SAFE_INTEGER;
  static #_LOG_LEVEL_VOICE_OF_ZEUS = Number.POSITIVE_INFINITY;

  static get LOG_LEVEL_TRACE() {
    return this.#_LOG_LEVEL_TRACE;
  }
  static get LOG_LEVEL_DEBUG() {
    return this.#_LOG_LEVEL_DEBUG;
  }
  static get LOG_LEVEL_INFO() {
    return this.#_LOG_LEVEL_INFO;
  }
  static get LOG_LEVEL_WARNING() {
    return this.#_LOG_LEVEL_WARNING;
  }
  static get LOG_LEVEL_ERROR() {
    return this.#_LOG_LEVEL_ERROR;
  }
  static get LOG_LEVEL_SILENT() {
    return this.#_LOG_LEVEL_SILENT;
  }
  static get LOG_LEVEL_VOICE_OF_ZEUS() {
    return this.#_LOG_LEVEL_VOICE_OF_ZEUS;
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.NameOfLevel"
  ////////////////////////////////////////////////////////////////////////////
  static NameOfLevel(level) {
    switch (level) {
      case this.#_LOG_LEVEL_TRACE:
        return 'TRACE';
      case this.#_LOG_LEVEL_DEBUG:
        return 'DEBUG';
      case this.#_LOG_LEVEL_INFO:
        return 'INFO';
      case this.#_LOG_LEVEL_WARNING:
        return 'WARNING';
      case this.#_LOG_LEVEL_ERROR:
        return 'ERROR';
      case this.#_LOG_LEVEL_SILENT:
        return 'SILENT';
      case this.#_LOG_LEVEL_VOICE_OF_ZEUS:
        return 'VOICE OF ZEUS';
      default:
        return `Unknown log level: ${level}`;
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.#_GenerateNamesByMapEntry"
  ////////////////////////////////////////////////////////////////////////////
  static #_GenerateNamesByMapEntry(level) {
    return [level, this.NameOfLevel(level)];
  }

  ////////////////////////////////////////////////////////////////////////////
  // \thing "Logger.NamesByLevel"
  ////////////////////////////////////////////////////////////////////////////
  static NamesByLevel = new Map([
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_TRACE),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_DEBUG),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_INFO),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_WARNING),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_ERROR),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_SILENT),
    this.#_GenerateNamesByMapEntry(this.#_LOG_LEVEL_VOICE_OF_ZEUS),
  ]);

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.MinLogLevel"
  ////////////////////////////////////////////////////////////////////////////
  static #_MinLogLevel = Logger.LOG_LEVEL_INFO;
  static get MinLogLevel() {
    return this.#_MinLogLevel;
  }

  static set MinLogLevel(value) {
    if (typeof value !== 'number') {
      throw new Error('Minimum log level is not a number');
    }

    if (value === this.MinLogLevel) {
      return;
    }

    this.#_MinLogLevel = value;
    this.VoiceOfZeus(
      `Logging level set to ${Logger.NameOfLevel(this.MinLogLevel)}`
    );

    if (this.MinLogLevel === Logger.LOG_LEVEL_SILENT) {
      this.VoiceOfZeus(
        'BEWARE, MORTAL: THE VOICE OF ZEUS CANNOT BE SILENCED.'
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.#_Log"
  ////////////////////////////////////////////////////////////////////////////
  static #_Log(severity, msg) {
    if (typeof severity !== 'number') {
      throw new Error('Log severity is not a number');
    }

    if (
      severity !== Logger.LOG_LEVEL_VOICE_OF_ZEUS &&
      (severity < this.MinLogLevel || severity === Logger.LOG_LEVEL_SILENT)
    ) {
      return;
    }

    console.log(`[${Logger.NameOfLevel(severity)}]: Hail Vestertopia! ${msg}`);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.Trace"
  ////////////////////////////////////////////////////////////////////////////
  static Trace(msg) {
    this.#_Log(Logger.LOG_LEVEL_TRACE, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.Debug"
  ////////////////////////////////////////////////////////////////////////////
  static Debug(msg) {
    this.#_Log(Logger.LOG_LEVEL_DEBUG, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.Info"
  ////////////////////////////////////////////////////////////////////////////
  static Info(msg) {
    this.#_Log(Logger.LOG_LEVEL_INFO, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.Error"
  ////////////////////////////////////////////////////////////////////////////
  static Error(msg) {
    this.#_Log(Logger.LOG_LEVEL_ERROR, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.ErrorAndThrow"
  ////////////////////////////////////////////////////////////////////////////
  static ErrorAndThrow(msg) {
    this.Error(msg);
    throw new Error(msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.VoiceOfZeus"
  ////////////////////////////////////////////////////////////////////////////
  static VoiceOfZeus(msg) {
    this.#_Log(Logger.LOG_LEVEL_VOICE_OF_ZEUS, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.Warning"
  ////////////////////////////////////////////////////////////////////////////
  static Warning(msg) {
    this.#_Log(Logger.LOG_LEVEL_WARNING, msg);
  }

  ////////////////////////////////////////////////////////////////////////////
  // \function "Logger.NameOfMinLogLevel"
  ////////////////////////////////////////////////////////////////////////////
  static NameOfMinLogLevel() {
    return Logger.NameOfLevel(this.MinLogLevel);
  }
}

////////////////////////////////////////////////////////////////////////////
// \class "PageHandler_Main"
//
// A page handler for the main BWA search page, i.e. the one that's more or
// less an index for the day-and-question-specific BWA search pages.
////////////////////////////////////////////////////////////////////////////
class PageHandler_Main {
  //////////////////////////////////////////////////////////////////////////
  // \function "PageHandler_Main.Handle"
  //////////////////////////////////////////////////////////////////////////
  Handle() {
    Logger.Debug('Handling main BWA search page');

    var bwaTable = DomQuerist.ExpectOne(document, 'table.bwa');
    var unhandledTds = DomQuerist.ExpectAnything(bwaTable, 'td.no');
    if (unhandledTds.length < 1) {
      Logger.Debug('No unhandled day-and-question BWA search pages found');
      return;
    }

    const randomIndex = Math.floor(Math.random() * unhandledTds.length);
    const randomTd = unhandledTds[randomIndex];
    const randomAnchor = GetElementAsAnchor(
      DomQuerist.ExpectOne(randomTd, 'a')
    );
    if (IsNullish(randomAnchor)) {
      Logger.ErrorAndThrow("Random unhandled anchor isn't, uh, an anchor");
    }

    const randomUrl = randomAnchor.href;
    const randomizer = document.createElement('a');
    randomizer.href = randomUrl;
    randomizer.innerText = 'Random unhandled question';

    bwaTable.parentNode.insertBefore(randomizer, bwaTable);
  }
}

////////////////////////////////////////////////////////////////////////////
// \class "PageHandler_Specific"
//
// A page handler for a day-and-question-specific BWA search page.
////////////////////////////////////////////////////////////////////////////
class PageHandler_Specific {
  //////////////////////////////////////////////////////////////////////////
  // \function "PageHandler_Specific.Handle"
  //////////////////////////////////////////////////////////////////////////
  Handle() {
    Logger.Debug('Handling day-and-question-specific BWA search page');

    var bwaForm = DomQuerist.ExpectZeroOrOne(document, 'form[name="bwa"]');
    if (IsNullish(bwaForm)) {
      // This is the case for pages that have already been handled.
      Logger.Debug('No BWA form found (probably already handled?)');
      return;
    }

    var checkboxes = DomQuerist.ExpectAnything(
      bwaForm,
      'input[name="bwasuggest[]"]'
    );
    Logger.Debug(`Found ${checkboxes.length} BWA suggestions`);

    // We're expecting any given checkbox to be immediately followed by its
    // label, and then by a <br>. We'll want to treat the three of them as a
    // single unit when removing and reinserting, so first let's collect all
    // such sets.
    var controlSets = this.#_CollectControlSets(checkboxes);

    // Now shuffle those sets (in memory).
    var unshuffledCount = controlSets.length;
    while (unshuffledCount > 0) {
      var pickedIndex = Math.floor(Math.random() * unshuffledCount);
      --unshuffledCount;

      var tmp = controlSets[unshuffledCount];
      controlSets[unshuffledCount] = controlSets[pickedIndex];
      controlSets[pickedIndex] = tmp;
    }

    // Remove them from and reinsert them into the actual DOM, in their new
    // and exciting order.
    var submitButton = DomQuerist.ExpectOne(bwaForm, 'input[type="submit"]');
    for (const controlSet of controlSets) {
      controlSet.checkbox.remove();
      bwaForm.insertBefore(controlSet.checkbox, submitButton);
      controlSet.label.remove();
      bwaForm.insertBefore(controlSet.label, submitButton);
      controlSet.br.remove();
      bwaForm.insertBefore(controlSet.br, submitButton);
    }
  }

  //////////////////////////////////////////////////////////////////////////
  // \function "PageHandler_Specific.#_CollectControlSets"
  //////////////////////////////////////////////////////////////////////////
  #_CollectControlSets(checkboxes) {
    const controlSets = [];

    for (const checkbox of checkboxes) {
      const cID = checkbox.id;
      if (IsNullishOrBlank(cID)) {
        Logger.ErrorAndThrow('BWA checkbox unexpectedly has no ID');
      }

      const label = GetElementAsLabel(checkbox.nextElementSibling);
      if (IsNullish(label)) {
        Logger.ErrorAndThrow(
          `BWA checkbox ${cID} does not have <label> as next sibling`
        );
      }

      if (label.htmlFor != cID) {
        Logger.ErrorAndThrow(
          `<label> following BWA checkbox ${cID} has unexpected 'for' of ${label.htmlFor}`
        );
      }

      const br = GetElementAsBr(label.nextElementSibling);
      if (IsNullish(br)) {
        Logger.ErrorAndThrow(
          `BWA checkbox ${cID} does not have <br> as twice-next sibling`
        );
      }

      const controlSet = {};
      controlSet.checkbox = checkbox;
      controlSet.label = label;
      controlSet.br = br;

      controlSets.push(controlSet);
    }

    return controlSets;
  }
}

////////////////////////////////////////////////////////////////////////////
// \class "PageHandlerRouter"
//
// A class to find the page handler appropriate for this page (if any) and
// route to it.
//
// A "page handler" should have a Handle() function for this class to call.
////////////////////////////////////////////////////////////////////////////
class PageHandlerRouter {
  //////////////////////////////////////////////////////////////////////////
  // \function "PageHandlerRouter.Route"
  //////////////////////////////////////////////////////////////////////////
  static Route() {
    var handler = null;

    if (IsNullishOrBlank(window.location.search)) {
      handler = new PageHandler_Main();
    } else {
      handler = new PageHandler_Specific();
    }

    if (IsNullish(handler)) {
      Logger.Debug(`No page handler found for ${pathname}`);
      return;
    }

    handler.Handle();
  }
}

//////////////////////////////////////////////////////////////////////////////
// Start of top-level code
//////////////////////////////////////////////////////////////////////////////
Main();
