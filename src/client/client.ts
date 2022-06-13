import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'dat.gui'
import { io } from 'socket.io-client'

const vertices = new Float32Array(1000 * 3);
const indices = new Uint16Array(1000 * 3);
let updates: number[];
updates = [];
let initialvertices = 0;
let addPoint=0
let check: number[];
check = [];

const scene = new THREE.Scene();
let mesh: THREE.Mesh;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
const gridHelper = new THREE.GridHelper(10, 10);
gridHelper.position.y = -0.5;
scene.add(gridHelper);
const geometry = new THREE.BufferGeometry();


window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}

function buildMesh() {
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
	//const material = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe : true } );
	mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
	animate();
}

const socket = io();
socket.on('connect', function () {
	console.log('connect');
});
socket.on('disconnect', function (message: any) {
	console.log('disconnect ' + message);
});

socket.on('stream vertices', (verts:number[]) => {
	let i=0
	verts.forEach( v => {
		vertices[i] = v;
		i++;
	});
});
socket.on('stream indices', (inds:number[]) => {
	inds.forEach( f => {
		indices[addPoint] = f;
		addPoint++;
	});
	buildMesh();
});

socket.on('stream base vertices', (verts:number[]) => {
	for(let i = 0; i < verts.length; i+=4) {
		vertices[verts[i]*3] = verts[i + 1];
		vertices[verts[i]*3 + 1] = verts[i + 2];
		vertices[verts[i]*3 + 2] = verts[i + 3];
	}
});
socket.on('stream base indices', (inds:number[]) => {
	for(let i = 0; i < inds.length; i+=4) {
		indices[inds[i]*3] = inds[i + 1];
		indices[inds[i]*3 + 1] = inds[i + 2];
		indices[inds[i]*3 + 2] = inds[i + 3];
	}
	buildMesh();
});
socket.on('vsplit vertices', (verts:number[]) => {
	vertices[verts[0]*3] = verts[0 + 1];
	vertices[verts[0]*3 + 1] = verts[0 + 2];
	vertices[verts[0]*3 + 2] = verts[0 + 3];
	//geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
});
socket.on('vsplit indices', (inds:number[]) => {
	//console.log(inds[0], inds[4])
	indices[inds[0]*3] = inds[0 + 1];
	indices[inds[0]*3 + 1] = inds[0 + 2];
	indices[inds[0]*3 + 2] = inds[0 + 3];
	indices[inds[4]*3] = inds[4 + 1];
	indices[inds[4]*3 + 1] = inds[4 + 2];
	indices[inds[4]*3 + 2] = inds[4 + 3];

	
	//mesh.geometry.attributes.index.needsUpdate = true;
	//buildMesh();
});
socket.on('vsplit updates', (vs:number, vt:number, ups:number[]) => {
	//console.log(ups)
	ups.forEach(u => {
		if(indices[u*3] === vs) {
			indices[u*3] = vt;
			//console.log(u, '0')
		} else if(indices[u*3 + 1] === vs) {
			indices[u*3 + 1] = vt;
			//console.log(u, '1')
		} else if(indices[u*3 + 2] === vs) {
			indices[u*3 + 2] = vt;
			//console.log(u, '2')
		}
	});
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	//geometry.index!.needsUpdate = true;
	//geometry.attributes.position.needsUpdate = true;
	//geometry.computeBoundingBox();
	//geometry.computeBoundingSphere();
	//geometry.computeVertexNormals();
	//mesh = new THREE.Mesh(geometry);
	//scene.add(mesh);
});
socket.on('buildmesh', function () {
	buildMesh();
});

 
socket.on('update vertices', (verts) => {
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
});
socket.on('update indices', (inds) => {
  geometry.setIndex(inds);
});

function startStreaming() {
	var type = params.type;

	/*if (mesh !== null) {
			scene.remove(mesh);
			vertices = [];
			indices = [];
		}*/
	socket.emit('request mesh', type);
}

function startCollapsing() {
	socket.emit('request simplify');
}

function startRebuilding() {
	if (mesh !== null) {
		scene.remove(mesh);
		vertices.fill(0);
		indices.fill(0);
	}
	socket.emit('request rebuild');
}

const gui = new GUI();

const cubeFolder = gui.addFolder('Mesh');
//add list to select mesh
const modelsFolder = gui.addFolder('Select Model');

//add button to start mesh streaming
var params = { 
	stream: () => startStreaming(),
	simplify: () => startCollapsing(),
	rebuild: () => startRebuilding(),
	type: ['cube', 'icosahedron', 'gourd', 'monkey']
};

gui
	.add(params,'stream')
	.name('stream mesh from server')
	.listen();

gui
	.add(params,'simplify')
	.name('simplify mesh')
	.listen();

gui
	.add(params,'rebuild')
	.name('rebuild mesh')
	.listen();

gui
	.add(params, 'type', [
		'cube',
		'icosahedron',
		'gourd',
		'monkey'
	])
	.name('select model')
	.listen();

const animate = function () {
	requestAnimationFrame(animate);
	controls.update();

	render();
}

const render = function () {
	renderer.render(scene, camera);
}

animate();
