import {Vector} from "./vector";
import {Face} from "./face";
import {Vertex} from "./vertex";
import {Wedge} from "./wedge";

export class Vsplit {
	vt_index: number;
  flclw?: Face; //a face in neighborhood of vsplit
  vlr_rot?: number; //encoding of vertex vr
  //struct
  vs_index: number; //index(0..2) of vs within flclw
  corners?: number; //corner continuities of Figure 9
  ii?: number; //geometry prediction of Figure 10
  matid_predict?: number; //are fl_matid, fr_matid required?
  //struct code
  fl_matid?: number; //matid of face fl if not predicted
  fr_matid?: number; //matid of face fr if not predicted
  vad_l?: Vertex; //vertex attribute
  vad_s = Vertex; //vertex attribute
  wads?: Wedge; //WedgeAttribD

  constructor() {
    this.vs_index = -1;
		this.vt_index = -1;
  }
}