"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vertex = void 0;
const vector_1 = require("./vector");
class Vertex {
    constructor(position) {
        this.position = position;
        this.idx = -1;
        this.ecolError = -1;
        this.minError = -1;
        this.totalError = -1;
        this.errorCount = -1;
        //this.ecolProspect = null;
    }
    delta() {
        return new vector_1.Vector();
    }
    halfedges(fn) {
        let start = true;
        let i = 0;
        for (let h = this.halfedge; start || h !== this.halfedge; h = h.twin.next) {
            fn(h, i);
            start = false;
            i++;
        }
    }
    faces(fn) {
        let start = true;
        let i = 0;
        for (let h = this.halfedge; start || h !== this.halfedge; h = h.twin.next) {
            if (h.onBoundary) {
                continue;
            }
            fn(h.face, i);
            start = false;
            i++;
        }
    }
    ecol_Error() {
        this.ecolError = 20;
        //find the outgoing halfedge with the lowest cost 
        this.halfedges(h => {
            let ecolError = this.h_ecolError(h);
            //no prospect for ecol found yet
            if (!this.ecolProspect) {
                this.ecolError = ecolError;
                this.minError = ecolError;
                this.ecolProspect = h;
                this.totalError = 0;
                this.errorCount = 0;
            }
            this.totalError += ecolError;
            this.errorCount++;
            if (ecolError < this.minError) {
                this.ecolProspect = h;
                this.minError = ecolError;
            }
        });
        //average ecolError
        this.ecolError = this.totalError / this.errorCount;
    }
    h_ecolError(h) {
        //error of collapsing halfedge this---h.next.vert
        //two faces on either side of the halfedge
        let heLen = h.vector().norm();
        let change = 0;
        //face furthest away from adjFaces
        this.faces(f => {
            let minChange = 1;
            h.next.vert.faces(f2 => {
                if (f == f2) {
                    minChange = Math.min(minChange, (1 - (f.normal().dot(f.normal()))) / 2);
                }
            });
            change = Math.max(change, minChange);
        });
        return heLen * change;
    }
}
exports.Vertex = Vertex;
