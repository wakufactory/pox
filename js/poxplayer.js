//poxplayer.js
//  PolygonExplorer Player
//   wakufactory.jp
"use strict" ;

var PoxPlayer  = function(can) {
	this.can = document.querySelector(can)  ;
	var Param = WBind.create() ;
	this.param = Param ;

	Param.bindInput("isStereo","#isstereo") ;
	Param.bindInput("autorot","#autorot") ;
	Param.bindInput("pause","#pause") ;
	Param.bindHtml("fps","#fps") ;

	// canvas initialize
	this.resize() ;
	window.addEventListener("resize",()=>{this.resize()}) ;
}
PoxPlayer.prototype.load = function(d) {
	return new Promise((resolve,reject) => {
		if(typeof d == "string") {
			var req = new XMLHttpRequest();
			req.open("get",location.search.substr(1),true) ;
			req.responseType = "json" ;
			req.onload = () => {
				if(req.status==200) {
	//				console.log(req.response) ;
					resolve(this.set(req.response)) ;
				} else {
					relect("Ajax error:"+req.statusText) ;					
				}
			}
			req.onerror = ()=> {
				reject("Ajax error:"+req.statusText)
			}
			req.send() ;		
		} else resolve(this.set(d)) ;
	})
}
PoxPlayer.prototype.set = function(d) { 
	var m = d.m ;
	var VS = d.vs ;
	var FS = d.fs ;
	// wwg initialize
	var wwg = new WWG() ;
	if(/*!wwg.init2(can) &&*/ !wwg.init(this.can,{preserveDrawingBuffer: true})) {
		alert("wgl not supported") ;
		return null ;
	}
	this.wwg = wwg ;
	this.active = true ;	
	var POX = {} ;
	POX.src = d ;
	this.pox = POX ;
	POX.setScene = (scene)=> {
		this.setScene(scene) ;
	}
	try {
		eval(m);
	}catch(err) {
		this.emsg = ("eval error "+err);
		return null ;
	}
	return POX ;
}
PoxPlayer.prototype.stop = function() {
	this.active = false ;
}
PoxPlayer.prototype.cls = function() {
	if(this.render) this.render.clear() ;
}
PoxPlayer.prototype.resize = function() {
	var pixRatio = window.devicePixelRatio 
	this.can.width= this.can.offsetWidth*pixRatio ;
	this.can.height = this.can.offsetHeight*pixRatio ;
	console.log("canvas:"+this.can.width+" x "+this.can.height);		
}

PoxPlayer.prototype.setScene = function(sc) {
//	console.log(sc) ;
	var wwg = this.wwg ;
	var pox = this.pox ;
	var can = this.can ;
	var Param = this.param ;
	sc.vshader = {text:pox.src.vs} ;
	sc.fshader = {text:pox.src.fs} ;
	pox.scene = sc ;
	var sset = pox.setting || {} ;
	if(!sset.scale) sset.scale = 1.0 ;
	//bind params 

	Param.camRX = 30 ;
	Param.camRY = -30 ;
	Param.camd = 5*sset.scale ;

	//create render unit
	var r = wwg.createRender() ;
	this.render = r ;
	r.setRender(sc).then(()=> {
		
console.log(r) ;
	
		mouse() ;
		if(window.GPad) GPad.init() ;	
		//draw loop
		var st = new Date().getTime() ;
		var lt = st ;
		var gp ;
		var ft = lt ;
		var fc = 0 ;
		var self = this ;
		(function loop(){
			if(self.active) window.requestAnimationFrame(loop) ;
			if(Param.pause) {
				Param.fps=0;
				return ;
			}
			if(window.GPad && (gp = GPad.get())) {
				Param.camRY += gp.axes[2] ;
				Param.camRX += gp.axes[3] ;
				Param.camd += gp.axes[1]/10 ;
			}
			var ct = new Date().getTime() ;
			var tint = (ct - st) ;
			fc++ ;
//console.log(fc);
			if(ct-ft>=1000) {
				Param.fps = fc ;
				fc = 0 ;
				ft = ct ; 

			}

//			if((ct - lt)<1000/60) return ;
			if(Param.autorot) Param.camRY += (ct-lt)/100 ;

			update(r,pox,Param,ct) ;
//			console.log(Math.floor(1000/(ct - lt)+0.5)) ;
			lt = ct ;
			Param.updateTimer() ;
		})();		
	}).catch(function(err){
		console.log(err) ;
	})
	return null ;
	
	// calc camera matrix
	function camMtx(render,p,sf) {
		var can = render.wwg.can ;
		var RAD = Math.PI/180 ;
		var dx = sf * 0.05 * sset.scale ;	// stereo base
		var aspect = can.width/(can.height*((p.isStereo)?2:1)) ;
		var ret = {};

		// bird camera mode 
		var mx = 0 ; var my = 0 ;var mz = 0 ;
		var camd=  p.camd ;
		var camX = -Math.sin(p.camRY*RAD)*camd*Math.cos(p.camRX*RAD)
		var camY = Math.sin(p.camRX*RAD)*camd ; 
		var camZ = Math.cos(p.camRY*RAD)*camd*Math.cos(p.camRX*RAD)
		var cx = 0 ,cy = 0, cz = 0 ;
		var upx = 0.01,upy = 1 ,upz = 0.01 ;

		// for stereo
		var xx =  upy * (camZ-cz) - upz * (camY-cy);
		var xy = -upx * (camZ-cz) + upz * (camX-cx);
		var xz =  upx * (camY-cy) - upy * (camX-cx);
		var mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
		xx /= mag ; xy /=mag ; xz /= mag ;
		camX += xx*dx+mx ;
		camY += xy*dx+my ;
		camZ += xz*dx+mz ;
		var camM = new CanvasMatrix4().lookat(camX,camY,camZ, cx+mx,cy+my,cz+mz, upx,upy,upz).
			perspective(p.isStereo?70:60,aspect, 0.01, 1000)

		return {camX:camX,camY:camY,camZ:camZ,camM:camM} ;
	}
	// calc model matrix
	function modelMtx(render,cam,update) {
		// calc each mvp matrix and invert matrix
		var mod = [] ;		
		for(var i=0;i<render.modelCount;i++) {
			var d = render.getModelData(i) ;
			var m = new CanvasMatrix4(d.bm) ;
			if(d.mm) m.multRight(d.mm) ;
			mod[i] = {
				vs_uni:{mvpMatrix:new CanvasMatrix4(m).
						multRight(cam.camM).getAsWebGLFloatArray(),
					invMatrix:new CanvasMatrix4(m).
						invert().transpose().getAsWebGLFloatArray()},
				fs_uni:{eyevec:[cam.camX,cam.camY,cam.camZ]}
			}
		}
		update.model = mod ;
		return update ;		
	}
	// update scene
	function update(render,scene,p,time) {
		// draw call 
		var cam,update = {} ;
		if(p.isStereo) {
			render.gl.viewport(0,0,can.width/2,can.height) ;
			cam = camMtx(render,p,-1) ;
			if(!Param.pause) update = scene.update(render,cam,time,-1)
			render.draw(modelMtx(render,cam,update),false) ;
			render.gl.viewport(can.width/2,0,can.width/2,can.height) ;
			cam = camMtx(render,p,1) ;
			if(!Param.pause) update = scene.update(render,cam,time,1)
			render.draw(modelMtx(render,cam,update),true) ;
		} else {
			render.gl.viewport(0,0,can.width,can.height) ;
			cam = camMtx(render,p,0) ;
			if(!Param.pause) update = scene.update(render,cam,time,0)
			render.draw(modelMtx(render,cam,update),false) ;
		}
	}
	// mouse and key intaraction
	var rotX = Param.camRX ,rotY = Param.camRY ;
	var gz = Param.camd ;
	function mouse() {
		//mouse intraction
		var mag = 300*window.devicePixelRatio /can.width;
		var keymag= 2 ;
		var m = new Pointer(can,{
			down:function(d) {
				if(Param.pause) return true;
				rotX = Param.camRX
				rotY = Param.camRY
				return false ;
			},
			move:function(d) {
				if(Param.pause) return true;
				Param.camRX = rotX+d.dy*mag ;
				Param.camRY = rotY+d.dx*mag ;
				if(Param.camRX>89)Param.camRX=89 ;
				if(Param.camRX<-89)Param.camRX=-89 ;
				return false ;
			},
			up:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				return false ;
			},
			out:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				return false ;
			},
			wheel:function(d) {
				if(Param.pause) return true;
				Param.camd += d/30*sset.scale ;
				if(Param.camd<0) Param.camd = 0 ;
				return false ;
			},
			gesture:function(z,r) {
				if(Param.pause) return true;
				if(z==0) {
					gz = Param.camd ;
					return false ;
				}
				Param.camd = gz / z ;
				return false ;
			},
		})
		WBind.addev(can,"keydown", function(ev){
			if(Param.pause) return true ;
			var z = Param.camd ;
			if(ev.altKey) {
				switch(ev.keyCode) {
					case 38:z = Param.camd - keymag*sset.scale ; if(Param.camd<0) Param.camd = 0 ; break ;
					case 40:z = Param.camd + keymag*sset.scale ; break ;
				}				
			} else {
				switch(ev.keyCode) {
					case 37:rotY -= keymag ; break ;
					case 38:rotX -= keymag ; if(rotX<-90) rotX = -90 ; break ;
					case 39:rotY += keymag ; break ;
					case 40:rotX += keymag ; if(rotX>90) rotX = 90 ; break ;
				}
			}
			Param.setTimer("camd",z,100) ;
			Param.setTimer("camRX",rotX,100) ;
			Param.setTimer("camRY",rotY,100) ;
		})		
	}
}