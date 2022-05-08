import {Vector} from "./vector";

export class Wedge {
    vidx?: number;
    normal?: Vector; //vector
    uv?: Vector; //uv texture coordinates
    idx: number;
  
    constructor() {
      this.idx = -1;
    }
  
    delta() {
      return new Vector();
    }
  }