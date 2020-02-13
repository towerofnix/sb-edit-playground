// Derived from JSON.as by John Maloney. Original license/info follows.

/*
 * Scratch Project Editor and Player
 * Copyright (C) 2014 Massachusetts Institute of Technology
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// JSON.as
// John Maloney, September 2010
//
// Convert between objects and their JSON string representation.
// Usage:
//  var s:String, obj:Object;
//  s = JSON.stringify(obj)
//  obj = JSON.parse(s)

const TAB_STRING = "\t";

module.exports = class ScratchFlashJSON {
  constructor() {
    this._src = null;
    this._buf = '';
    this._tabs = '';
    this._needsComma = false;
    this._doFormatting = null;
  }

  _error(msg) {
    throw new Error(msg + " [pos=" + src.pos()) + "] in " + buf;
  }

  static stringify(obj, doFormatting = true) {
    // Return the JSON string representation for the given object.
    var json = new ScratchFlashJSON();
    json._doFormatting = doFormatting;
    json._write(obj);
    return json._buf;
  }

  //----------------------------
  // Object to JSON support
  //----------------------------

  writeKeyValue(key, value) {
    // This method is called by custom writeJSON() methods.
    if (this._needsComma) this._buf += this._doFormatting ? ",\n" : ", ";
    this._buf += this._tabs + '"' + key + '": ';
    this._write(value);
    this._needsComma = true;
  }

  _write(value) {
    // Write a value in JSON format. The argument of the top-level call is usually an object or array.
    if (typeof value === 'number') this._buf += isFinite(value) ? value : '0';
    else if (typeof value === 'boolean') this._buf += value;
    else if (typeof value === 'string') this._buf += '"' + this._encodeString(value) + '"';
    // else if (value is ByteArray) buf += '"' + encodeString(value.toString()) + '"';
    else if (value == null) this._buf += "null";
    else if (Array.isArray(value)) this._writeArray(value);
    // else if (value is BitmapData) buf += "null"; // bitmaps sometimes appear in old project info objects
    else this._writeObject(value);
  }

  _writeObject(obj) {
    var savedNeedsComma = this._needsComma;
    this._needsComma = false;
    this._buf += "{";
    if (this._doFormatting) this._buf += "\n";
    this._indent();
    if (typeof obj === 'object') {
      for (var k in obj) this.writeKeyValue(k, obj[k]);
    } else {
      obj.writeJSON(this);
    }
    if (this._doFormatting && this._needsComma) this._buf += '\n';
    this._outdent();
    this._buf += this._tabs + "}";
    this._needsComma = savedNeedsComma;
  }

  _writeArray(a) {
    var separator = ", ";
    var indented = this._doFormatting && ((a.length > 13) || this._needsMultipleLines(a, 13));
    this._buf += "[";
    this._indent();
    if (indented) separator = ",\n" + this._tabs;
    for (var i = 0; i < a.length; i++) {
      this._write(a[i]);
      if (i < (a.length - 1)) this._buf += separator;
    }
    this._outdent();
    this._buf += "]";
  }

  _needsMultipleLines(arrayValue, limit) {
    // Return true if this array is short enough to fit on one line.
    // (This is simply to make the JSON representation of stacks more readable.)
    var i = 0, count = 0;
    var toDo = [arrayValue];
    while (toDo.length > 0) {
      var a = toDo.pop();
      count += a.length;
      if (count > limit) return true;
      for (i = 0; i < a.length; i++) {
        var item = a[i];
        if (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'string' || item == null) continue; // atomic value
        if (Array.isArray(item)) toDo.push(item);
        else return true; // object with fields
      }
    }
    return false;
  }

  _encodeString(s) {
    var result = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var code = s.charCodeAt(i);
      if (code < 32) {
        if (code == 9) result += "\\t";
        else if (code == 10) result += "\\n";
        else if (code == 13) result += "\\r";
        else {
          var hex = code.toString(16);
          while (hex.length < 4) hex = '0' + hex;
          result += '\\u' + hex;
        }
        continue;
      } else if (ch == "\\") result += "\\\\";
      else if (ch == '"') result += '\\"';
      // else if (ch == "/") result += "\\/";
      else result += ch;
    }
    return result;
  }

  _indent() { if (this._doFormatting) this._tabs += TAB_STRING }

  _outdent() {
    if (this._tabs.length == 0) return;
    this._tabs = this._tabs.slice(0, this._tabs.length - TAB_STRING.length);
  }
}

if (require.main === module) {
    const fs = require('fs');
    console.log(module.exports.stringify(JSON.parse(fs.readFileSync(0, 'utf-8'))));
}
