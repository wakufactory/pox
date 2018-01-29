//poxplayer.js
//  PolygonExplorer Player
//   wakufactory.jp
"use strict" ;

var PoxPlayer  = function(can) {
	this.can = document.querySelector(can)  ;
	this.pixRatio = window.devicePixelRatio ;
	var Param = WBind.create() ;
	this.param = Param ;
	// wwg initialize
	var wwg = new WWG() ;
	if(/*!wwg.init2(can) &&*/ !wwg.init(this.can,{preserveDrawingBuffer: true})) {
		alert("wgl not supported") ;
		return null ;
	}
	this.wwg = wwg ;

	if(window.WAS!=undefined) this.synth = new WAS.synth() 

	Param.bindInput("isStereo","#isstereo") ;
	Param.bindInput("autorot","#autorot") ;
	Param.bindInput("pause","#pause") ;
	Param.bindHtml("fps","#fps") ;
	
	//camera initial
	this.cam = {
		camCX:0,
		camCY:0,
		camCZ:0,
		camVX:0,
		camVY:0,
		camVZ:1,
		camUPX:0,
		camUPY:1,
		camUPZ:0,
		camRX:30,
		camRY:-30,
		camd:5,
		camAngle:60,	//cam angle(deg) 
		camWidth:1.0,
		camNear:0.01, 	//near
		camFar:1000, 	//far
		camGyro:true, // use gyro
		sbase:0.05 	//streobase 
		
	} ;
	this.pox = {} ;
	// canvas initialize
	this.resize() ;
	window.addEventListener("resize",()=>{this.resize()}) ;
	this.pause = true ;
	this.setEvent() ;
}
PoxPlayer.prototype.resize = function() {
	this.can.width= this.can.offsetWidth*this.pixRatio  ;
	this.can.height = this.can.offsetHeight*this.pixRatio  ;
	console.log("canvas:"+this.can.width+" x "+this.can.height);		
}
PoxPlayer.prototype.load = async function(d) {
	return new Promise((resolve,reject) => {
		if(typeof d == "string") {
			var req = new XMLHttpRequest();
			req.open("get",d,true) ;
			req.responseType = "json" ;
			req.onload = () => {
				if(req.status==200) {
	//				console.log(req.response) ;
					resolve(req.response) ;
				} else {
					reject("Ajax error:"+req.statusText) ;					
				}
			}
			req.onerror = ()=> {
				reject("Ajax error:"+req.statusText)
			}
			req.send() ;		
		} else resolve(d) ;
	})
}

PoxPlayer.prototype.set = async function(d,param={}) { 
	
//	return new Promise((resolve,reject) => {
	var VS = d.vs ;
	var FS = d.fs ;
	console.log("set")
	this.pox  = {src:d,can:this.can,wwg:this.wwg,synth:this.synth,param:param} ;
	var POX = this.pox ;
	function V3add() {
		var x=0,y=0,z=0 ;
		for(var i=0;i<arguments.length;i++) {
			x += arguments[i][0] ;y += arguments[i][1] ;z += arguments[i][2] ;
		}
		return [x,y,z] ;
	}
	function V3len(v) {
		return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) ;
	}
	function V3norm(v,s) {
		var l = V3len(v) ;
		if(s===undefined) s = 1 ;
		return (l==0)?[0,0,0]:[v[0]*s/l,v[1]*s/l,v[2]*s/l] ;
	}
	function V3mult(v,s) {
		return [v[0]*s,v[1]*s,v[2]*s] ;
	}
	function V3dot(v1,v2) {
		return v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2] ;
	}

	POX.setScene = (scene)=> {
		this.setScene(scene) ;
	}
	POX.log = (msg)=> {
		if(this.errCb) this.errCb(msg) ;
	}
//	this.parseJS(d.m).then((m)=> {
	var m = await this.parseJS(d.m) ;
		try {
			eval(m);	 //EVALUATE CODE
		}catch(err) {
			this.emsg = ("eval error "+err);
			console.log("eval error "+err)
			return(null);
		}
		if(POX.init) POX.init() ;
		return(POX) ;
//	})
	
//	})
}
PoxPlayer.prototype.parseJS = function(src) {

	return new Promise((resolve,reject) => {
		var s = src.split("\n") ;
		var inc = [] ;
		for(var v of s) {
			if(v.match(/^\/\/\@INCLUDE\("(.+)"\)/)) {
				inc.push( this.wwg.loadAjax(RegExp.$1)) ;
			} 
		}
		Promise.all(inc).then((res)=>{
			var ret = [] ;
			var c = 0 ;
			for(var v of s) {
				if(v.match(/^\/\/\@INCLUDE\("(.+)"\)/)) {
					ret = ret.concat(res[c++].split("\n"))
				} else ret.push(v) ;
			}
			resolve( ret.join("\n"))  ;
		})
	})
}
PoxPlayer.prototype.setPacked = function(param={}) { 
	
}
PoxPlayer.prototype.stop = function() {
	window.cancelAnimationFrame(this.loop) ; 
	if(this.pox.unload) this.pox.unload() ;
}
PoxPlayer.prototype.cls = function() {
	if(this.render) this.render.clear() ;
}
PoxPlayer.prototype.setError = function(err) {
	this.errCb = err ;
}
PoxPlayer.prototype.setParam = function(dom) {
	let param = this.pox.setting.param ;
	if(param===undefined) return ;
	this.uparam = WBind.create()
	let input = [] ;
	for(let i in param) {
		let p = param[i] ;
		let name = (p.name)?p.name:i ;
		let type = (p.type)?p.type:"range" 
		input.push(
			`<div class=t>${name}</div> <input type=${type} id="${i}" min=0 max=100  /><span id=${"d_"+i}></span><br/>`
		)
	}
	dom.innerHTML = input.join("") 
	function _tohex(v) {
		let s = (v*255).toString(16) ;
		if(s.length==1) s = "0"+s ;
		return s ;
	}
	function _setdisp(i,v) {
		if(param[i].type=="color" && v ) {
			$('d_'+i).innerHTML = v.map((v)=>v.toString().substr(0,5)) ;
		} else $('d_'+i).innerHTML = v.toString().substr(0,5) ;		
	}
	for(let i in param) {
		this.uparam.bindInput(i,"#"+i)
		this.uparam.setFunc(i,{
			set:(v)=> {
				let ret = v ;
				if(param[i].type=="color") {
					ret = "#"+_tohex(v[0])+_tohex(v[1])+_tohex(v[2])
				} else  ret = (v - param[i].min)*100/(param[i].max - param[i].min)
//				console.log(ret)
				_setdisp(i,v)
				return ret 	
			},
			get:(v)=> {
				let ret ;
				if(param[i].type=="color" ) {
					if(typeof v =="string" && v.match(/#[0-9A-F]+/i)) {
						ret =[parseInt(v.substr(1,2),16)/255,parseInt(v.substr(3,2),16)/255,parseInt(v.substr(5,2),16)/255] ;
					} else ret = v ;
				} else ret = v*(param[i].max-param[i].min)/100+param[i].min			
				return ret ;
			},
			input:(v)=>{
				_setdisp(i,this.uparam[i])
			}
		})
		this.uparam[i] = param[i].value ;
	}
	this.pox.param = this.uparam ;
}
PoxPlayer.prototype.setEvent = function() {
	// mouse and key intaraction
	var cam = this.cam ;
	var rotX = cam.camRX ,rotY = cam.camRY ;
	var gev=null,gx=0,gy=0 ;
	var gz = cam.camd ;
	var dragging = false ;
	var pixRatio = this.pixRatio
	var Param = this.param ;
	var can = this.can ;
	var self = this ;
		//mouse intraction
		var mag = 300*pixRatio /can.width;
		var keymag= 2 ;
		var m = new Pointer(can,{
			down:function(d) {
				if(Param.pause) return true;
				rotX = cam.camRX
				rotY = cam.camRY
				dragging = true ;
				if(self.pox.event) self.pox.event("down",{x:d.x*pixRatio,y:d.y*pixRatio,sx:d.sx*pixRatio,sy:d.sy*pixRatio}) ;
				$('isstereo').focus() ;
				return false ;
			},
			move:function(d) {
				if(Param.pause) return true;
				cam.camRX = rotX+d.dy*mag ;
				cam.camRY = rotY+d.dx*mag ;
				if(cam.camRX>90)cam.camRX=90;
				if(cam.camRX<-90)cam.camRX=-90;

				if(self.pox.event) self.pox.event("move",{x:d.x*pixRatio,y:d.y*pixRatio,ox:d.ox*pixRatio,oy:d.oy*pixRatio,dx:d.dx*pixRatio,dy:d.dy*pixRatio}) ;
				return false ;
			},
			up:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				if(gev!==null) {
					gx = gev.rx - rotX ;
					gy = gev.ry - rotY ;
					console.log(gx+"/"+gy) ;
				}
				dragging = false ;
				if(self.pox.event) self.pox.event("up",{x:d.x*pixRatio,y:d.y*pixRatio,dx:d.dx*pixRatio,dy:d.dy*pixRatio,ex:d.ex*pixRatio,ey:d.ey*pixRatio}) ;
				return false ;
			},
			out:function(d) {
				rotX += d.dy*mag ;
				rotY += d.dx*mag; 
				dragging = false ;
				if(self.pox.event) self.pox.event("out",{x:d.x*pixRatio,y:d.y*pixRatio,dx:d.dx*pixRatio,dy:d.dy*pixRatio}) ;
				return false ;
			},
			wheel:function(d) {
				if(Param.pause) return true;
				cam.camd += d/100 * self.pox.setting.scale ;
//				if(cam.camd<0) cam.camd = 0 ;
				if(self.pox.event) self.pox.event("wheel",d) ;
				return false ;
			},
			gesture:function(z,r) {
				if(Param.pause) return true;
				if(z==0) {
					gz = cam.camd ; 
					return false ;
				}
				cam.camd = gz / z ;
				if(self.pox.event) self.pox.event("gesture",z) ;
				return false ;
			},
			gyro:function(ev) {
				if(Param.pause || !cam.camGyro) return true;
				if(ev.rx===null) return true ;
				gev = ev ;
				if(dragging) return true ;
//				console.log(ev) ;
				cam.camRX = ev.rx - gx;
				cam.camRY = ev.ry - gy ;
//		console.log(gx+"/"+gy) ;
				if(cam.camRX>89)cam.camRX=89 ;
				if(cam.camRX<-89)cam.camRX=-89 ;

				return false ;
			}
		})
		WBind.addev(window,"keydown", function(ev){
//			console.log("key"+ev.keyCode);
			if(Param.pause) return true ;
			if(self.pox.event) {
				if(!self.pox.event("key",ev)) return true ;
			}
			var z = cam.camd ;
			if(ev.altKey) {
				switch(ev.keyCode) {
					case 38:cam.camd = cam.camd - keymag; if(cam.camd<0) cam.camd = 0 ; break ;
					case 40:cam.camd = cam.camd + keymag ; break ;
				}				
			} else {
				switch(ev.keyCode) {
					case 37:cam.camRY -= keymag ; break ;
					case 38:cam.camRX -= keymag ; if(cam.camRX<-90) cam.camRX = -90 ; break ;
					case 39:cam.camRY += keymag ; break ;
					case 40:cam.camRX += keymag ; if(cam.camRX>90) cam.camRX = 90 ; break ;
				}
			}
			
			return true ;
		})		

	
}

PoxPlayer.prototype.setScene = function(sc) {
//	console.log(sc) ;
	var wwg = this.wwg ;
	var pox = this.pox ;
	var can = this.can ;
	var cam = this.cam ;
	var pixRatio = this.pixRatio
	var Param = this.param ;
	sc.vshader = {text:pox.src.vs} ;
	sc.fshader = {text:pox.src.fs} ;
	pox.scene = sc ;
	var sset = pox.setting || {} ;
	if(!sset.scale) sset.scale = 1.0 ;
	if(sset.cam!==undefined) {
		for(var k in sset.cam) {
			cam[k] = sset.cam[k] ;
		}
	}
	pox.cam = cam ;

	//create render unit
	var r = wwg.createRender() ;
	this.render = r ;

	r.setRender(sc).then(()=> {
		
console.log(r) ;
		if(this.errCb) this.errCb("scene set ok") ;
		if(this.renderStart) this.renderStart() ;
		if(window.GPad) GPad.init() ;	
		//draw loop
		var st = new Date().getTime() ;
		var tt = 0 ;
		var rt = 0 ;
		var ft = st ;
		var fc = 0 ;
		var gp ;

		var self = this ;
		(function loop(){
			self.loop = window.requestAnimationFrame(loop) ;
			var ct = new Date().getTime() ;
			if(Param.pause) {
				Param.fps=0;
				tt = rt ;
				st = ct ;
				return ;
			}
			rt = tt + ct-st ;
			fc++ ;
			if(ct-ft>=1000) {
				Param.fps = fc ;
				fc = 0 ;
				ft = ct ; 
			}
			if(Param.autorot) cam.camRY = (rt/100)%360;
			if(window.GPad && (gp = GPad.get())) {
				cam.camRY += gp.axes[2] ;
				cam.camRX += gp.axes[3] ;
				cam.camd += gp.axes[1]/10 ;
			}
			update(r,pox,cam,rt) ;
			Param.updateTimer() ;
		})();		
	}).catch((err)=>{
		console.log(err) ;
		if(this.errCb) this.errCb(err) ;
	})
	
	// calc camera matrix
	function camMtx(render,cam,sf) {
		var can = render.wwg.can ;
		var RAD = Math.PI/180 ;
		var dx = sf * cam.sbase * sset.scale ;	// stereo base
		var aspect = can.width/(can.height*((Param.isStereo)?2:1)) ;
		var ret = {};
//console.log(cam);
//console.log(cam.camRX+"/"+cam.camRY) ;
		if(cam.camMode=="fix") {
			var cx = cam.camVX ;
			var cy = cam.camVY ;
			var cz = cam.camVZ ;
			var upx = cam.camUPX ;
			var upy = cam.camUPY ;
			var upz = cam.camUPZ ;
			var camX = 0 ,camY = 0, camZ = 0 ;			
		}
		else if(cam.camMode=="vr") {
			// self camera mode 
			var cx = Math.sin(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)
			var cy = -Math.sin(cam.camRX*RAD)*1 ; 
			var cz = -Math.cos(cam.camRY*RAD)*1*Math.cos(cam.camRX*RAD)
			var camX = 0 ,camY = 0, camZ = 0 ;
			var upx =0 ,upy = 1 ,upz = 0 ;		
		} else {
		// bird camera mode 
			var camd=  cam.camd*sset.scale ;
			var camX = -Math.sin(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			var camY = Math.sin(cam.camRX*RAD)*camd ; 
			var camZ = Math.cos(cam.camRY*RAD)*camd*Math.cos(cam.camRX*RAD)
			var cx = 0 ,cy = 0, cz = 0 ;
			if(camd<0) {
				cx = camX*2 ;cy = camY*2 ;cz = camZ*2 ;
			}

			var upx = 0.,upy = 1 ,upz = 0. ;
		}

		// for stereo
		if(dx!=0) {
			var xx =  upy * (camZ-cz) - upz * (camY-cy);
			var xy = -upx * (camZ-cz) + upz * (camX-cx);
			var xz =  upx * (camY-cy) - upy * (camX-cx);
			var mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
			xx *= dx/mag ; xy *=dx/mag ; xz *= dx/mag ;
//			console.log(dx+":"+xx+"/"+xy+"/"+xz)
			camX += xx ;
			camY += xy ;
			camZ += xz ;
			cx += xx ;
			cy += xy ;
			cz += xz ;
		}
		var camM = new CanvasMatrix4().lookat(camX+cam.camCX,camY+cam.camCY,camZ+cam.camCZ,
		cx+cam.camCX,cy+cam.camCY,cz+cam.camCZ, upx,upy,upz) ;
		if(cam.camAngle!=0) camM = camM.perspective(cam.camAngle,aspect, cam.camNear, cam.camFar)
		else camM = camM.pallarel(cam.camd,aspect, cam.camNear, cam.camFar) ;

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
			if(render.data.group) {
				var g = render.data.group ;
				for(var gi = 0 ;gi < g.length;gi++) {
					var gg = g[gi] ;
					if(!gg.bm) continue ;
					for(var ggi=0;ggi<gg.model.length;ggi++) {
						if(render.getModelIdx(gg.model[ggi])==i) m.multRight(gg.bm) ;
					}
				}
			}
			var uni = {
				vs_uni:{
					modelMatrix:new CanvasMatrix4(m).getAsWebGLFloatArray(),
					mvpMatrix:new CanvasMatrix4(m).
						multRight(cam.camM).getAsWebGLFloatArray(),
					invMatrix:new CanvasMatrix4(m).
						invert().transpose().getAsWebGLFloatArray(),
					eyevec:[cam.camX,cam.camY,cam.camZ]}
			}
			uni.fs_uni = uni.vs_uni
			uni.fs_uni.resolution = [can.width,can.height]
			mod[i]  = uni ;
		}
		update.model = mod ;
//	console.log(update) ;
		return update ;		
	}
	// update scene
	function update(render,scene,cam,time) {
		// draw call 
		var camm,update = {} ;
		if(Param.isStereo) {
			render.gl.viewport(0,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,-1)
			camm = camMtx(render,cam,-1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			if(update.fs_uni==undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 1 ;
			update.fs_uni.stereo = 1 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),false) ;
			render.gl.viewport(can.width/2,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,1)
			camm = camMtx(render,cam,1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			if(update.fs_uni==undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 2 ;
			update.fs_uni.stereo = 2 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),true) ;
		} else {
			render.gl.viewport(0,0,can.width,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,0)
			camm = camMtx(render,cam,0) ;
			if(update.vs_uni===undefined) update.vs_uni = {} ;
			if(update.fs_uni===undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 0 ;
			update.fs_uni.stereo = 0 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),false) ;
		}
	}
}
PoxPlayer.prototype.GLSLScene = function(sc) {
	return new Promise((resolve,reject) => {

		//create render unit
		var r = wwg.createRender() ;
		this.render = r ;
		r.setRender(sc).then(()=> {
			
		})
	})
	return null ;		
}