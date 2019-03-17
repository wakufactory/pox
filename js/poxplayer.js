//poxplayer.js
//  PolygonExplorer Player
//   wakufactory.jp
"use strict" ;
const Mat4 = CanvasMatrix4 // alias
const RAD = Math.PI/180 ;
const PoxPlayer  = function(can,opt) {
	this.version = "1.2.0" 
	if(!Promise) {
		alert("This browser is not supported!!") ;
		return null ;		
	}
	if(!opt) opt = {} 
	this.can = (can instanceof HTMLElement)?can:document.querySelector(can)  ;

	// wwg initialize
	const wwg = new WWG() ;
	const useWebGL2 = !opt.noWebGL2
	if(!(useWebGL2 && wwg.init2(this.can,{preserveDrawingBuffer: opt.capture})) && !wwg.init(this.can,{preserveDrawingBuffer: opt.capture})) {
		alert("wgl not supported") ;
		return null ;
	}
	if(opt.needWebGL2 && wwg.version!=2) {
		alert("needs wgl2")
		return null 
	}
	this.wwg = wwg ;
	if(window.WAS!=undefined) this.synth = new WAS.synth() 
	
	const Param = WBind.create() ;
	this.param = Param ;
	Param.bindInput("isStereo",(opt.ui && opt.ui.isStereo)?opt.ui.isStereo:"#isstereo") ;
	Param.bindInput("autorot",(opt.ui && opt.ui.autorot)?opt.ui.autorot:"#autorot") ;
	Param.bindInput("pause",(opt.ui && opt.ui.pause)?opt.ui.pause:"#pause") ;
	Param.bindHtml("fps",(opt.ui && opt.ui.fps)?opt.ui.fps:"#fps") ;
	Param.bindInput("camselect",(opt.ui && opt.ui.camselect)?opt.ui.camselect:"#camselect") ;
	
	this.pixRatio = 1 
	this.pox = {} ;

	// canvas initialize
	this.resize() ;
	window.addEventListener("resize",()=>{this.resize()}) ;
	this.pause = true ;

	//set key capture dummy input
	const e = document.createElement("input") ;
	e.setAttribute("type","checkbox") ;
	e.style.position = "absolute" ; e.style.zIndex = -100 ;
	e.style.top = 0
	e.style.width = 10 ; e.style.height =10 ; e.style.padding = 0 ; e.style.border = "none" ; e.style.opacity = 0 ;
	this.can.parentNode.appendChild(e) ;
	this.keyElelment = e ;
	this.keyElelment.focus() ;

	this.setEvent() ;
	// VR init 
	if(navigator.getVRDisplays) {
		navigator.getVRDisplays().then((displays)=> {
			this.vrDisplay = displays[displays.length - 1]
			console.log(this.vrDisplay)
			window.addEventListener('vrdisplaypresentchange', ()=>{
				console.log("vr presenting= "+this.vrDisplay.isPresenting)
				if(this.vrDisplay.isPresenting) {
					this.callEvent("vrchange",1)
				} else {
					this.resize() ;
					this.callEvent("vrchange",0)
				}
			}, false);
			window.addEventListener('vrdisplayactivate', ()=>{
				console.log("vr active")
			}, false);
			window.addEventListener('vrdisplaydeactivate', ()=>{
				console.log("vr deactive")
			}, false);
		})
	}
	//create default camera

	this.cam0 = this.createCamera()
	this.cam0.setCam({})
	this.cam1 = this.createCamera() ;
	this.ccam = this.cam1 
	console.log(this)
}
PoxPlayer.prototype.enterVR = function() {
	let ret = true
	if(this.vrDisplay) {
		console.log("enter VR")
		const p = { source: this.can,attributes:{} }
		if(this.pox.setting.highRefreshRate!==undefined) p.attributes.highRefreshRate = this.pox.setting.highRefreshRate
		if(this.pox.setting.foveationLevel!==undefined) p.attributes.foveationLevel = this.pox.setting.foveationLevel
		this.vrDisplay.requestPresent([p]).then( () =>{
			console.log("present ok")
			const leftEye = this.vrDisplay.getEyeParameters("left");
			const rightEye = this.vrDisplay.getEyeParameters("right");
			this.can.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
			this.can.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
			if(this.vrDisplay.displayName=="Oculus Go") {
				this.can.width = 2560
				this.can.height = 1280
			}
			this.can.width= this.can.width * this.pixRatio 
			this.can.height= this.can.height * this.pixRatio 
			console.log("vr canvas:"+this.can.width+" x "+this.can.height);
		}).catch((err)=> {
			console.log(err)
		})
	} else if(document.body.webkitRequestFullscreen) {
		console.log("fullscreen")
		const base = this.can.parentNode
		this.ssize = {width:base.offsetWidth,height:base.offsetHeight}
		document.addEventListener("webkitfullscreenchange",(ev)=>{
			console.log("fs "+document.webkitFullscreenElement)
			if( document.webkitFullscreenElement) {
				base.style.width = window.innerWidth + "px"
				base.style.height = window.innerHeight + "px"				
			} else {
				base.style.width = this.ssize.width + "px"
				base.style.height = this.ssize.height + "px"					
			}
		})
		base.webkitRequestFullscreen()
	} else ret = false 
	return ret 
}
PoxPlayer.prototype.setEvent = function() {
	// mouse and key intaraction
	let dragging = false ;
	const Param = this.param ;
	const can = this.can ;

	//mouse intraction
	const m = new Pointer(can,{
		down:(d)=> {
			if(!this.ccam || Param.pause) return true ;
			let ret = true ;
			ret = this.callEvent("down",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,sx:d.sx*this.pixRatio,sy:d.sy*this.pixRatio}) ;
			if(ret) this.ccam.event("down",d)
			dragging = true ;
//			if(this.ccam.cam.camMode=="walk") this.keyElelment.focus() ;
			return false ;
		},
		move:(d)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			ret = this.callEvent("move",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,ox:d.ox*this.pixRatio,oy:d.oy*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio}) ;
			if(ret) this.ccam.event("move",d) 
			return false ;
		},
		up:(d)=> {
			if(!this.ccam) return true ;
			dragging = false ;
			let ret = true ;
			ret = this.callEvent("up",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio,ex:d.ex*this.pixRatio,ey:d.ey*this.pixRatio}) ;
			if(ret) this.ccam.event("up",d)
			return false ;
		},
		out:(d)=> {
			if(!this.ccam) return true ;
			dragging = false ;
			let ret = true ;
			ret = this.callEvent("out",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio}) ;
			if(ret) this.ccam.event("out",d) 
			return false ;
		},
		wheel:(d)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			ret = this.callEvent("wheel",d) ;
			if(ret) this.ccam.event("wheel",d) 
			return false ;
		},
		gesture:(z,r)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			ret = this.callEvent("gesture",{z:z,r:r}) ;
			if(ret) this.ccam.event("gesture",{z:z,r:r}) 
			return false ;
		},
		gyro:(ev)=> {
			if(!this.ccam || Param.pause ) return true;
			if(dragging) return true ;
			let ret = true ;
			ret = this.callEvent("gyro",ev) ;
			if(ret) this.ccam.event("gyro",ev) 
			return false ;
		}
	})
	WBind.addev(this.keyElelment,"keydown", (ev)=>{
//		console.log("key:"+ev.key);
		if( Param.pause) return true ;
		if(this.pox.event) {
			if(!this.callEvent("keydown",ev)) return true ;
		}
		if(this.ccam) this.ccam.event("keydown",ev) 
		return false ;
	})
	WBind.addev(this.keyElelment,"keyup", (ev)=>{
//		console.log("key up:"+ev.key);
		if(Param.pause) return true ;
		if(this.pox.event) {
			if(!this.callEvent("keyup",ev)) return true ;
		}
		if(this.ccam) this.ccam.event("keyup",ev)
		return false ;
	})		
	document.querySelectorAll("#bc button").forEach((o)=>{
		o.addEventListener("mousedown", (ev)=>{
			this.callEvent("btndown",ev.target.id) ;
			this.ccam.event("keydown",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
		o.addEventListener("touchstart", (ev)=>{
			this.callEvent("touchstart",ev.target.id) ;
			this.ccam.event("keydown",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
		o.addEventListener("mouseup", (ev)=>{
			this.callEvent("btnup",ev.target.id) ;
			this.ccam.event("keyup",{key:ev.target.getAttribute("data-key")})
//			this.keyElelment.focus() ;
			ev.preventDefault()
		})
		o.addEventListener("touchend", (ev)=>{
			ret = true; 
			ret = this.callEvent("touchend",ev.target.id) ;
			if(ret) this.ccam.event("keyup",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
	})

}
PoxPlayer.prototype.resize = function() {
//	console.log("wresize:"+document.body.offsetWidth+" x "+document.body.offsetHeight);
	if(this.can.offsetWidth < 300 || 
		(this.vrDisplay && this.vrDisplay.isPresenting)) return 
	this.can.width= this.can.offsetWidth*this.pixRatio  ;
	this.can.height = this.can.offsetHeight*this.pixRatio  ;
	console.log("canvas:"+this.can.width+" x "+this.can.height);		
}
PoxPlayer.prototype.load = async function(d) {
	return new Promise((resolve,reject) => {
		if(typeof d == "string") {
			const req = new XMLHttpRequest();
			req.open("get",d,true) ;
			req.responseType = "json" ;
			req.onload = () => {
				if(req.status==200) {
//					console.log(req.response) ;
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

PoxPlayer.prototype.loadImage = function(path) {
	if(path.match(/^https?:/)) {
		return this.wwg.loadImageAjax(path)
	}else {
		return new Promise((resolve,reject) => {
			const img = new Image() ;
			img.onload = ()=> {
				resolve( img ) ;
			}
			img.onerror = ()=> {
				reject("cannot load image") ;
			}
			img.src = path ;
		})
	}
}
//for compati
	function V3add() {
		let x=0,y=0,z=0 ;
		for(let i=0;i<arguments.length;i++) {
			x += arguments[i][0] ;y += arguments[i][1] ;z += arguments[i][2] ;
		}
		return [x,y,z] ;
	}
	function V3len(v) {
		return Math.hypot(v[0],v[1],v[2]) ;
	}
	function V3norm(v,s) {
		const l = V3len(v) ;
		if(s===undefined) s = 1 ;
		return (l==0)?[0,0,0]:[v[0]*s/l,v[1]*s/l,v[2]*s/l] ;
	}
	function V3mult(v,s) {
		return [v[0]*s,v[1]*s,v[2]*s] ;
	}
	function V3dot(v1,v2) {
		return v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2] ;
	}
	
PoxPlayer.prototype.set = async function(d,param={},uidom) { 
	const VS = d.vs ;
	const FS = d.fs ;
	this.pox  = {src:d,can:this.can,wwg:this.wwg,synth:this.synth,param:param,poxp:this} ;
	if(window.GPad) {
		this.pox.gPad = new GPad()
		this.pox.gPad.ev = (pad,b,p)=> {
			ret = this.callEvent("gpad",pad,{btrig:b,ptrig:p}) ;
		}
	}
	const POX = this.pox ;
	POX.loadImage = this.loadImage 
	POX.loadAjax = this.wwg.loadAjax
	POX.V3add = function() {
		let x=0,y=0,z=0 ;
		for(let i=0;i<arguments.length;i++) {
			x += arguments[i][0] ;y += arguments[i][1] ;z += arguments[i][2] ;
		}
		return [x,y,z] ;
	}
	POX.V3len = function(v) {
		return Math.hypot(v[0],v[1],v[2]) ;
	}
	POX.V3norm = function(v,s) {
		const l = V3len(v) ;
		if(s===undefined) s = 1 ;
		return (l==0)?[0,0,0]:[v[0]*s/l,v[1]*s/l,v[2]*s/l] ;
	}
	POX.V3mult = function(v,s) {
		return [v[0]*s,v[1]*s,v[2]*s] ;
	}
	POX.V3dot = function(v1,v2) {
		return v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2] ;
	}
	POX.setScene = async (scene)=> {
		return new Promise((resolve,reject) => {
			this.setScene(scene).then( () => {
				resolve() ;
			}).catch((err)=>	 {
				console.log("render err"+err.stack)
			})
		})
	}
	POX.log = (msg)=> {
		if(this.errCb) this.errCb(msg) ;
	}
//	this.parseJS(d.m).then((m)=> {
	const m = await this.parseJS(d.m) ;
		try {
			POX.eval = new Function("POX",'"use strict";'+m)
		}catch(err) {
//			console.log(err)
			this.emsg = ("parse error "+err.stack);
//			throw new Error('reject!!')
			return(null);
		}
		try {
			POX.eval(POX)

		}catch(err) {
//			console.log(err.stack)
			this.emsg = ("eval error "+err.stack);
//			throw new Error('reject!!2')
			return(null);
		}

		if(uidom) this.setParam(uidom)
		if(POX.init) {
			try {
				await POX.init()
			}catch(err) {
//				console.log(err)
				this.emsg = ("init error "+err.stack);
//				throw new Error('reject!!2')
				return null
			}
		}
		return(POX) ;
}
PoxPlayer.prototype.parseJS = function(src) {

	return new Promise((resolve,reject) => {
		const s = src.split("\n") ;
		const inc = [] ;
		for(let v of s) {
			if(v.match(/^\/\/\@INCLUDE\("(.+)"\)/)) {
				inc.push( this.wwg.loadAjax(RegExp.$1)) ;
			} 
		}
		Promise.all(inc).then((res)=>{
			let ret = [] ;
			let c = 0 ;
			for(let v of s) {
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
PoxPlayer.prototype.callEvent = function(kind,ev,opt) {
	if(!this.pox.event) return true
	let ret = true 
	try {
		ret = this.pox.event(kind,ev,opt)
	} catch(err) {
		this.errCb(err.stack)
	}
	return ret 
}
PoxPlayer.prototype.setParam = function(dom) {
	const param = this.pox.setting.param ;
	if(param===undefined) return ;
	this.uparam = WBind.create()
	const input = [] ;
	for(let i in param) {
		const p = param[i] ;
		const name = (p.name)?p.name:i ;
		if(!p.type) p.type = "range" 
		if(!p.step) p.step = 100 ;
		let tag = `<div class=t>${name}</div> <input type=${p.type} id="_p_${i}" min=0 max=${p.step} style="${(p.type=="disp")?"display:none":""}"  /><span id=${"_p_d_"+i}></span><br/>`
		input.push(
			tag
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
			document.getElementById('_p_d_'+i).innerHTML = v.map((v)=>v.toString().substr(0,5)) ;
		} else if(param[i].type=="range")  document.getElementById('_p_d_'+i).innerHTML = v.toString().substr(0,5) ;	
		else document.getElementById('_p_d_'+i).innerHTML = v
	}
	for(let i in param) {
		this.uparam.bindInput(i,"#_p_"+i)
		this.uparam.setFunc(i,{
			set:(v)=> {
				let ret = v ;
				if(param[i].type=="color") {
					ret = "#"+_tohex(v[0])+_tohex(v[1])+_tohex(v[2])
				} else if(param[i].type=="range") ret = (v - param[i].min)*(param[i].step)/(param[i].max - param[i].min)
				else ret = v ;
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
				} else if(param[i].type=="range" ) ret = v*(param[i].max-param[i].min)/(param[i].step)+param[i].min	
				else ret = v ;		
				return ret ;
			},
			input:(v)=>{
				_setdisp(i,this.uparam[i])
//				this.keyElelment.focus()
			}
		})
		this.uparam[i] = param[i].value ;
	}
	this.pox.param = this.uparam ;
}


PoxPlayer.prototype.setScene = function(sc) {
//	console.log(sc) ;

	const wwg = this.wwg ;
	const pox = this.pox ;
	const can = this.can ;

	const pixRatio = this.pixRatio
	const Param = this.param ;
	const sset = pox.setting || {} ;
	if(!sset.scale) sset.scale = 1.0 ;
	

	sc.vshader = {text:pox.src.vs} ;
	sc.fshader = {text:pox.src.fs} ;
	pox.scene = sc ;

	//create render unit
	const r = wwg.createRender() ;
	this.render = r ;
	pox.render = r ;

	let ccam = this.ccam
	pox.cam = this.cam1.cam ;
	this.isVR = false 
	const self = this 
	const bm = new CanvasMatrix4()
	const mMtx = []
	const vMtx = []
	const mvMtx = []
	const vpMtx = []
	const iMtx = []
	
	return new Promise((resolve,reject) => {
	r.setRender(sc).then(()=> {	
		if(this.errCb) this.errCb("scene set ok") ;
		if(this.renderStart) this.renderStart() ;
		if(pox.gPad) pox.gPad.init(0) ;	
		if(pox.setting && pox.setting.pixRatio) { 
			this.pixRatio = pox.setting.pixRatio ;
		} else {
			this.pixRatio = window.devicePixelRatio ;
		}
		this.resize();
		
		if(pox.setting.cam) this.cam1.setCam(pox.setting.cam)
//		if(ccam.cam.camMode=="walk") this.keyElelment.focus() ;
		this.keyElelment.value = "" ;
		
		resolve()
		//draw loop
		let st = new Date().getTime() ;
		this.ctime = st 
		this.ltime = st 
		let tt = 0 ;
		let rt = 0 ;
		let ft = st ;
		let fc = 0 ;
		let gpad 
		const loopf = () => {
//			console.log("************loop")
			if(this.vrDisplay && this.vrDisplay.isPresenting) {
				this.loop = this.vrDisplay.requestAnimationFrame(loopf)
				this.isVR = true 

			} else {
				this.loop = window.requestAnimationFrame(loopf) ;
				this.isVR = false ;
			}
			const ct = new Date().getTime() ;
			this.ctime = ct 
			if(Param.pause) {
				Param.fps=0;
				tt = rt ;
				st = ct ;
				return ;
			}
			rt = tt + ct-st ;
			fc++ ;
			if(ct-ft>=500) {
//				if(this.isVR) console.log(fc)
				Param.fps = Math.floor(fc*1000/(ct-ft)+0.5) ;
				fc = 0 ;
				ft = ct ; 
			}
			this.ccam = (Param.camselect)?this.cam0:this.cam1
			ccam = this.ccam 

			if(Param.autorot) ccam.setCam({camRY:(rt/100)%360}) ;
			if(pox.gPad &&(gpad = pox.gPad.get())) {	
//				ret = callEvent("gpad",gp,GPad.lastGp) 
				if(ccam.cam.gPad ) ccam.setPad( gpad )
			}
			ccam.update()	// camera update
			update(r,pox,this.cam1.cam,rt) ; // scene update 
			Param.updateTimer() ;
			if(this.vrDisplay && this.vrDisplay.isPresenting) this.vrDisplay.submitFrame()
			this.ltime = ct 
		}
		loopf() ;		
	}).catch((err)=>{
		console.log(err) ;
		if(this.errCb) this.errCb(err.stack?err.stack:err) ;
		reject(err) 
	})
	}) // promise
	
	// calc model matrix
	function modelMtx2(render,camm) {

		// calc each mvp matrix and invert matrix
		const mod = [[],[]] ;		
		for(let i=0;i<render.modelCount;i++) {
			let d = render.getModelData(i) ;
			bm.load(d.bm)
			if(d.mm) bm.multRight(d.mm) ;
			if(render.data.group) {
				let g = render.data.group ;
				for(let gi = 0 ;gi < g.length;gi++) {
					let gg = g[gi] ;
					if(!gg.bm) continue ;
					for(let ggi=0;ggi<gg.model.length;ggi++) {
						if(render.getModelIdx(gg.model[ggi])==i) bm.multRight(gg.bm) ;
					}
				}
			}
			if(!mMtx[i]) mMtx[i] = new CanvasMatrix4()
			if(!iMtx[i]) iMtx[i] = new CanvasMatrix4()
			if(!mvMtx[i]) mvMtx[i] = [new CanvasMatrix4(),new CanvasMatrix4()]			
			if(!vpMtx[i]) vpMtx[i] = [new CanvasMatrix4(),new CanvasMatrix4()]			

			const uni0 = {
				vs_uni:{
					modelMatrix:mMtx[i].load(bm).getAsWebGLFloatArray(),
					vpMatrix:vpMtx[i][0].load((d.camFix)?camm[0].camP:camm[0].camVP).getAsWebGLFloatArray(),
					mvpMatrix:mvMtx[i][0].load(bm).multRight( (d.camFix)?camm[0].camP:camm[0].camVP).getAsWebGLFloatArray(),
					invMatrix:iMtx[i].load(bm).
						invert().transpose().getAsWebGLFloatArray()}
			}
			const uni1 = {
				vs_uni:{
					modelMatrix:mMtx[i].load(bm).getAsWebGLFloatArray(),
					vpMatrix:vpMtx[i][1].load((d.camFix)?camm[1].camP:camm[1].camVP).getAsWebGLFloatArray(),
					mvpMatrix:mvMtx[i][1].load(bm).multRight( (d.camFix)?camm[1].camP:camm[1].camVP).getAsWebGLFloatArray(),
					invMatrix:iMtx[i].load(bm).
						invert().transpose().getAsWebGLFloatArray()}
			}
			uni0.fs_uni = uni0.vs_uni
			uni1.fs_uni = uni1.vs_uni
			uni0.fs_uni.vpMatrix_l = uni0.fs_uni.vpMatrix 
			uni0.fs_uni.vpMatrix_r = uni1.fs_uni.vpMatrix 
			uni1.fs_uni.vpMatrix_l = uni0.fs_uni.vpMatrix 
			uni1.fs_uni.vpMatrix_r = uni1.fs_uni.vpMatrix 			
			mod[0][i] = uni0 
			mod[1][i] = uni1 
		}
		let up = [{model:mod[0],fs_uni:{},vs_uni:{}},
			{model:mod[1],fs_uni:{},vs_uni:{}}]

		up[0].fs_uni.resolution = [can.width,can.height]
		up[0].fs_uni.camMatirx = camm[0].camV.getAsWebGLFloatArray()
		up[0].fs_uni.eyevec = [camm[0].camX,camm[0].camY,camm[0].camZ]
		up[0].vs_uni.stereo = 1 ;
		up[0].vs_uni.camMatirx = up[0].fs_uni.camMatirx
		up[0].vs_uni.eyevec = up[0].fs_uni.eyevec 
	
		up[1].fs_uni.resolution = up[0].fs_uni.resolution
		up[1].fs_uni.camMatirx = camm[1].camV.getAsWebGLFloatArray()
		up[1].fs_uni.eyevec = [camm[1].camX,camm[1].camY,camm[1].camZ]
		up[1].vs_uni.stereo = 2  ;	
		up[1].vs_uni.camMatirx = up[1].fs_uni.camMatirx
		up[1].vs_uni.eyevec = up[1].fs_uni.eyevec 	
		return up ;		
	}
	// update scene

	function update(render,pox,cam,time) {
		// draw call 
		let camm,update = {} ;
		if(Param.isStereo || self.isVR) {
			if(!Param.pause) update = pox.update(render,cam,time,-1)
			camm = ccam.getMtx(sset.scale,1) ;
			let mtx2 = modelMtx2(render,camm) ;
			if(update.vs_uni===undefined) update.vs_uni = {} ;
			if(update.fs_uni===undefined) update.fs_uni = {} ;
			update.fs_uni.time = time/1000 ;
			update.vs_uni.time = time/1000 ;			
			render.gl.viewport(0,0,can.width/2,can.height) ;			
			render.draw([update,mtx2[0]],false) ;
			render.gl.viewport(can.width/2,0,can.width/2,can.height) ;
			render.draw([update,mtx2[1]],true) ;
		} else {
			if(!Param.pause) update = pox.update(render,cam,time,0)
			camm = ccam.getMtx(sset.scale,0) ;
			let mtx2 = modelMtx2(render,camm) ;
			if(update.vs_uni===undefined) update.vs_uni = {} ;
			if(update.fs_uni===undefined) update.fs_uni = {} ;
			mtx2[0].vs_uni.stereo = 0 ;
			update.fs_uni.time = time/1000 ;
			update.vs_uni.time = time/1000 ;	
			render.gl.viewport(0,0,can.width,can.height) ;
			render.draw([update,mtx2[0]],false) ;
		}
	}
}
