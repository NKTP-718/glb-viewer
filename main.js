import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

// SETUP
const RENDERER = new THREE.WebGLRenderer({canvas:document.querySelector('#here-lies-the-model')});
const SCENE = new THREE.Scene();
const CAMERA = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.1, 1000);

const PANE = new Pane();
const CLOCK = new THREE.Clock();
const ORBIT = new OrbitControls( CAMERA, RENDERER.domElement);

RENDERER.setSize( window.innerWidth, window.innerHeight);
RENDERER.setPixelRatio( window.devicePixelRatio);
CAMERA.position.set( 2, 2, 5);
// ORBIT.update();

// HELPERS
let SKELETON;
const AXES = new THREE.AxesHelper(5);
const GRID = new THREE.GridHelper(5);
// SCENE.add(AXES);
// SCENE.add(GRID);
let helpers = { axes: false, grid: false, wireframe: false, skeleton: false};

// LIGHTING
const AMBIENTLIGHT = new THREE.AmbientLight(0xFFFFFF, 1.0);
const DIRECTIONALLIGHT = new THREE.DirectionalLight(0xFFFFFF, 1.5);

DIRECTIONALLIGHT.position.set( 0, 5, 10);
SCENE.add(DIRECTIONALLIGHT);
SCENE.add(AMBIENTLIGHT);
let lights = { 'ambient light intensity': 1.0, 'ambient light color': 0xFFFFFF, 'directional light intensity': 1.5, 'directional light color': 0xFFFFFF}

// GLOBALS
let animations = {};
let actions = {};
let speed = {'playback speed': 1.0};

// INTERFACE
const display_folder = PANE.addFolder({ title:'Display', expanded:false});
const light_folder = PANE.addFolder({ title:'Lighting', expanded:false});
const animation_folder = PANE.addFolder({ title:'Animations', expanded:true});

// LOADING MODEL
const LOADER = new GLTFLoader();
let model;
let mixer;

document.getElementById('gltf-file').addEventListener('change', e =>
{
	if(model)
	{
		SCENE.remove(model);
		display_folder.children[2].dispose();
		display_folder.children[2].dispose();
		for (let i = 0; i < Object.keys(animations).length; i++)
			animation_folder.children[animation_folder.children.length-1].dispose();
	}
	animations = {};
	PANE.refresh();
	LOADER.load( URL.createObjectURL(e.target.files[0]), gltf => load_model(gltf));
	document.querySelector('.overlay').style.display = 'none';
});

function load_model(gltf)
{
	model = gltf.scene;
	// model.scale.set( 2, 2, 2);
	SCENE.add(model);

	mixer = new THREE.AnimationMixer(model);
	RENDERER.render( SCENE, CAMERA);

	// ADDING ANIMATIONS
	gltf.animations.forEach( action => { actions[action.name] = mixer.clipAction(action); animations[action.name] = false; } );
	for( const name in animations)
		animation_folder.addInput( animations, name).on( 'change', e => e.value?actions[name].play():actions[name].stop());

	// WIREFRAME
	display_folder.addInput( helpers, 'wireframe').on( 'change', e =>
		model.traverse( child => {if(child.isMesh) child.material.wireframe = e.value;}));
	// SKELETON
	SKELETON = new THREE.SkeletonHelper(model);
	display_folder.addInput( helpers, 'skeleton').on( 'change', e => e.value?SCENE.add(SKELETON):SCENE.remove(SKELETON))
	console.log(animation_folder.children.length);

}

// DISPLAY FOLDER
display_folder.addInput( helpers, 'grid').on( 'change', e => e.value?SCENE.add(GRID):SCENE.remove(GRID));
display_folder.addInput( helpers, 'axes').on( 'change', e => e.value?SCENE.add(AXES):SCENE.remove(AXES));

// LIGHTINGS FOLDER
light_folder.addInput( lights, 'ambient light intensity', { min: 0.0, max: 2.0}).on('change', e => AMBIENTLIGHT.intensity = e.value);
light_folder.addInput( lights, 'ambient light color', {view:'color'}).on('change', e => AMBIENTLIGHT.color = new THREE.Color(e.value));
light_folder.addInput( lights, 'directional light intensity', { min: 0.0, max: 3.0}).on('change', e => DIRECTIONALLIGHT.intensity = e.value);
light_folder.addInput( lights, 'directional light color', {view:'color'}).on('change', e => DIRECTIONALLIGHT.color = new THREE.Color(e.value));

// ANIMATIONS FOLDER
animation_folder.addInput( speed, 'playback speed', { min: 0.1, max: 2.0}).on('change', e =>
{
	for (const name in animations)
		actions[name].setEffectiveTimeScale(e.value);
});
animation_folder.addButton({title:'play all'}).on( 'click', e =>
{
	for (const name in animations)
		animations[name] = true;
	PANE.refresh();
});

// FPS GRPAH
PANE.addSeparator();
PANE.registerPlugin(EssentialsPlugin);
const FPSMONITOR = PANE.addBlade({ view: 'fpsgraph', label: 'FPS', lineCount: 2});

// RESET MODEL
PANE.addSeparator();
PANE.addButton({title:'reset'}).on( 'click', e =>
{
	speed['playback speed'] = 1.0;
	for( const helper in helpers)
		helpers[helper] = false;
	for (const name in animations)
		animations[name] = false;
	lights['ambient light intensity'] = 1.0;
	lights['ambient light color'] = 0xFFFFFF;
	lights['directional light intensity'] = 1.5;
	lights['directional light color'] = 0xFFFFFF;
	PANE.refresh();
});

function render()
{
	requestAnimationFrame(render);
	FPSMONITOR.begin();
	if(mixer)
	{
		for( const name in animations)
		{
			if(animations[name])
			{
				actions[name].paused = false;
				actions[name].play();
				mixer.update(CLOCK.getDelta());
			}
			else
			{
				actions[name].paused = true;
				actions[name].stop();
			}
		}
	}
	RENDERER.render( SCENE, CAMERA);
	ORBIT.update();
	FPSMONITOR.end();
}
render();