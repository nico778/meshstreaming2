import {Vector} from "./vector";
import {Wedge} from "./wedge";
import {Halfedge} from "./halfedge";

export class Face {
    wedges?: Wedge[]; //wedges at corners of the face
    fnei?: Face[]; //3 face neighbors
    matid?: number; //material identifier
    idx: number;
    halfedge?: Halfedge; //maybe
  
    constructor() {
      this.idx = -1;
    }
}