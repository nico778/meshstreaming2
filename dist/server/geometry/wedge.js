"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wedge = void 0;
const vector_1 = require("./vector");
class Wedge {
    constructor() {
        this.idx = -1;
    }
    delta() {
        return new vector_1.Vector();
    }
}
exports.Wedge = Wedge;
