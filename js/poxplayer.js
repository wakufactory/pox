//poxplayer.js
//  PolygonExplorer Player
//   wakufactory.jp
"use strict" ;

const PoxPlayer  = function(can) {
	if(!Promise) {
		alert("This browser is not supported!!") ;
		return null ;		
	}
	this.can = document.querySelector(can)  ;

	// wwg initialize
	const wwg = new WWG() ;
	if(/*!wwg.init2(can) &&*/ !wwg.init(this.can,{preserveDrawingBuffer: true})) {
		alert("wgl not supported") ;
		return null ;
	}
	this.wwg = wwg ;
	if(window.WAS!=undefined) this.synth = new WAS.synth() 
	
	const Param = WBind.create() ;
	this.param = Param ;
	Param.bindInput("isStereo","#isstereo") ;
	Param.bindInput("autorot","#autorot") ;
	Param.bindInput("pause","#pause") ;
	Param.bindHtml("fps","#fps") ;

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
	document.body.appendChild(e) ;
	this.keyElelment = e ;
	this.keyElelment.focus() ;
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
			const req = new XMLHttpRequest();
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
	const VS = d.vs ;
	const FS = d.fs ;
	this.pox  = {src:d,can:this.can,wwg:this.wwg,synth:this.synth,param:param} ;
	const POX = this.pox ;

	function V3add() {
		let x=0,y=0,z=0 ;
		for(let i=0;i<arguments.length;i++) {
			x += arguments[i][0] ;y += arguments[i][1] ;z += arguments[i][2] ;
		}
		return [x,y,z] ;
	}
	function V3len(v) {
		return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) ;
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

	POX.setScene = async (scene)=> {
		return new Promise((resolve,reject) => {
			this.setScene(scene).then( () => {
				resolve() ;
			})
		})
	}
	POX.log = (msg)=> {
		if(this.errCb) this.errCb(msg) ;
	}
//	this.parseJS(d.m).then((m)=> {
	const m = await this.parseJS(d.m) ;
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
PoxPlayer.prototype.setParam = function(dom) {
	const param = this.pox.setting.param ;
	if(param===undefined) return ;
	this.uparam = WBind.create()
	const input = [] ;
	for(let i in param) {
		const p = param[i] ;
		const name = (p.name)?p.name:i ;
		if(!p.type) p.type = "range" 
		let tag = `<div class=t>${name}</div> <input type=${p.type} id="${i}" min=0 max=100 style="${(p.type=="disp")?"display:none":""}"  /><span id=${"d_"+i}></span><br/>`
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
				} else if(param[i].type=="range") ret = (v - param[i].min)*100/(param[i].max - param[i].min)
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
				} else if(param[i].type=="range" ) ret = v*(param[i].max-param[i].min)/100+param[i].min	
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
			if(this.pox.event) ret = this.pox.event("down",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,sx:d.sx*this.pixRatio,sy:d.sy*this.pixRatio}) ;
			if(ret) this.ccam.event("down",d)
			dragging = true ;
			if(this.ccam.cam.camMode=="walk") this.keyElelment.focus() ;
			return false ;
		},
		move:(d)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("move",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,ox:d.ox*this.pixRatio,oy:d.oy*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio}) ;
			if(ret) this.ccam.event("move",d) 
			return false ;
		},
		up:(d)=> {
			if(!this.ccam) return true ;
			dragging = false ;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("up",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio,ex:d.ex*this.pixRatio,ey:d.ey*this.pixRatio}) ;
			if(ret) this.ccam.event("up",d)
			return false ;
		},
		out:(d)=> {
			if(!this.ccam) return true ;
			dragging = false ;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("out",{x:d.x*this.pixRatio,y:d.y*this.pixRatio,dx:d.dx*this.pixRatio,dy:d.dy*this.pixRatio}) ;
			if(ret) this.ccam.event("out",d) 
			return false ;
		},
		wheel:(d)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("wheel",d) ;
			if(ret) this.ccam.event("wheel",d) 
			return false ;
		},
		gesture:(z,r)=> {
			if(!this.ccam || Param.pause) return true;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("gesture",{z:z,r:r}) ;
			if(ret) this.ccam.event("gesture",{z:z,r:r}) 
			return false ;
		},
		gyro:(ev)=> {
			if(!this.ccam || Param.pause) return true;
			if(dragging) return true ;
			let ret = true ;
			if(this.pox.event) ret = this.pox.event("gyro",ev) ;
			if(ret) this.ccam.event("gyro",ev) 
			return false ;
		}
	})
	WBind.addev(this.keyElelment,"keydown", (ev)=>{
//		console.log("key:"+ev.key);
		if( Param.pause) return true ;
		if(this.pox.event) {
			if(!this.pox.event("keydown",ev)) return true ;
		}
		if(this.ccam) this.ccam.event("keydown",ev) 
		return false ;
	})
	WBind.addev(this.keyElelment,"keyup", (ev)=>{
//		console.log("key up:"+ev.key);
		if(Param.pause) return true ;
		if(this.pox.event) {
			if(!this.pox.event("keyup",ev)) return true ;
		}
		if(this.ccam) this.ccam.event("keyup",ev)
		return false ;
	})		
	document.querySelectorAll("#bc button").forEach((o)=>{
		o.addEventListener("mousedown", (ev)=>{
			if(this.pox.event) this.pox.event("btndown",ev.target.id) ;
			this.ccam.event("keydown",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
		o.addEventListener("touchstart", (ev)=>{
			if(this.pox.event) this.pox.event("touchstart",ev.target.id) ;
			this.ccam.event("keydown",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
		o.addEventListener("mouseup", (ev)=>{
			if(this.pox.event) this.pox.event("btnup",ev.target.id) ;
			this.ccam.event("keyup",{key:ev.target.getAttribute("data-key")})
			this.keyElelment.focus() ;
			ev.preventDefault()
		})
		o.addEventListener("touchend", (ev)=>{
			ret = true; 
			if(this.pox.event) ret = this.pox.event("touchend",ev.target.id) ;
			if(ret) this.ccam.event("keyup",{key:ev.target.getAttribute("data-key")})
			ev.preventDefault()
		})
	})
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
	
	//create default camera
	const ccam = this.createCamera() ;
	this.ccam = ccam ;
	pox.cam = ccam.cam ;
	return new Promise((resolve,reject) => {
	r.setRender(sc).then(()=> {		
console.log(r) ;
		if(this.errCb) this.errCb("scene set ok") ;
		if(this.renderStart) this.renderStart() ;
		if(window.GPad) GPad.init() ;	
		if(pox.setting && pox.setting.pixRatio) { 
			this.pixRatio = pox.setting.pixRatio ;
		} else {
			this.pixRatio = window.devicePixelRatio ;
		}
		this.resize();

		if(pox.setting.cam) ccam.setCam(pox.setting.cam)
		if(ccam.cam.camMode=="walk") this.keyElelment.focus() ;
		this.keyElelment.value = "" ;
		
		resolve()
		//draw loop
		let st = new Date().getTime() ;
		let tt = 0 ;
		let rt = 0 ;
		let ft = st ;
		let fc = 0 ;
		let gp ;

		const loopf = () => {
			this.loop = window.requestAnimationFrame(loopf) ;
			const ct = new Date().getTime() ;
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
			if(Param.autorot) ccam.setCam({camRY:(rt/100)%360}) ;
			if(window.GPad && ccam.cam.gPad && (gp = GPad.get())) {
				let ret = true ;
				if(pox.event) ret = pox.event("gpad",gp) 
				if(ret) ccam.setPad( gp )
			}
			ccam.update()	// camera update
			update(r,pox,ccam.cam,rt) ; // scene update 
			Param.updateTimer() ;
		}
		loopf() ;		
	}).catch((err)=>{
		console.log(err) ;
		if(this.errCb) this.errCb(err) ;
		reject() 
	})
	}) // promise
	
	// calc model matrix
	function modelMtx(render,cam,update) {
		// calc each mvp matrix and invert matrix
		const mod = [] ;		
		for(let i=0;i<render.modelCount;i++) {
			let d = render.getModelData(i) ;
			let m = new CanvasMatrix4(d.bm) ;
			if(d.mm) m.multRight(d.mm) ;
			if(render.data.group) {
				let g = render.data.group ;
				for(let gi = 0 ;gi < g.length;gi++) {
					let gg = g[gi] ;
					if(!gg.bm) continue ;
					for(let ggi=0;ggi<gg.model.length;ggi++) {
						if(render.getModelIdx(gg.model[ggi])==i) m.multRight(gg.bm) ;
					}
				}
			}
			const uni = {
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
		let camm,update = {} ;
		if(Param.isStereo) {
			render.gl.viewport(0,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,-1)
			camm = ccam.getMtx(sset.scale,-1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			if(update.fs_uni==undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 1 ;
			update.fs_uni.stereo = 1 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),false) ;
			render.gl.viewport(can.width/2,0,can.width/2,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,1)
			camm = ccam.getMtx(sset.scale,1) ;
			if(update.vs_uni==undefined) update.vs_uni = {} ;
			if(update.fs_uni==undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 2 ;
			update.fs_uni.stereo = 2 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),true) ;
		} else {
			render.gl.viewport(0,0,can.width,can.height) ;
			if(!Param.pause) update = scene.update(render,cam,time,0)
//			camm = camMtx(render,cam,0) ;
			camm = ccam.getMtx(sset.scale,0) ;
			if(update.vs_uni===undefined) update.vs_uni = {} ;
			if(update.fs_uni===undefined) update.fs_uni = {} ;
			update.vs_uni.stereo = 0 ;
			update.fs_uni.stereo = 0 ;
			update.fs_uni.time = time/1000 ;
			render.draw(modelMtx(render,camm,update),false) ;
		}
	}
}

// camera object
PoxPlayer.prototype.createCamera = function(cam) {
	return new this.Camera(this,cam) ;
}
PoxPlayer.prototype.Camera = function(poxp,cam) {
	this.poxp = poxp ;
	this.render = poxp.render ;
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
		sbase:0.05, 	//streobase 
		vcx:0,
		vcz:0
	} ;
	for(let i in cam) {
		this.cam[i] = cam[i] ;
	}
	this.rotX = 0 ;
	this.rotY = 0 ;
	this.gev = null ;
	this.gx = 0 ; this.gy = 0 ; this.gz = 0 ;
	this.vrx = 0 ;this.vry = 0 ;
	this.keydown = false ;
	this.RAD = Math.PI/180 ;
}
PoxPlayer.prototype.Camera.prototype.setCam = function(cam) {
	for(let i in cam) {
		this.cam[i] = cam[i] ;
	}
}
PoxPlayer.prototype.Camera.prototype.event = function(ev,m) {
	const RAD = Math.PI/180 ;
	const mag = 300*this.poxp.pixRatio /this.poxp.can.width;
	const scale = this.poxp.pox.setting.scale ;

//	console.log("cam "+ev+" key:"+m.key)
	switch(ev) {
		case "down":
			this.rotX = this.cam.camRX
			this.rotY = this.cam.camRY
			break ;
		case "move":
			this.cam.camRX = this.rotX+m.dy*mag ;
			this.cam.camRY = this.rotY+m.dx*mag ;
			if(this.cam.camRX>89)this.cam.camRX=89;
			if(this.cam.camRX<-89)this.cam.camRX=-89;
			break ;
		case "up":
			this.rotX += m.dy*mag ;
			this.rotY += m.dx*mag; 
			if(this.gev!==null) {
				this.gx = this.gev.rx - this.rotX ;
				this.gy = this.gev.ry - this.rotY ;
//				console.log(this.gx+"/"+this.gy) ;
			}
			break ;
		case "out":
			this.rotX += m.dy*mag ;
			this.rotY += m.dx*mag; 
			break ;	
		case "wheel":
			this.cam.camd += m/100 * scale ;
			break ;	
		case "gesture":
			if(m.z==0) {
				this.gz = this.cam.camd ; 
				return false ;
			}
			this.cam.camd = this.gz / m.z ;
			break ;	
		case "gyro":
//		console.log(m)
			if(this.keydown || !this.cam.camGyro) return true ;
			if(m.rx===null) return true ;
			this.gev = m ;
			this.cam.camRX = m.rx - this.gx;
			this.cam.camRY = m.ry - this.gy ;
//		console.log(gx+"/"+gy) ;
			if(this.cam.camRX>89)this.cam.camRX=89 ;
			if(this.cam.camRX<-89)this.cam.camRX=-89 ;
			break ;
		case "keydown":
			const z = this.cam.camd ;
			const keymag= 1 ;
			let md = "" ;
			this.keydown = true ;
			if(m.altKey) {
				switch(m.key) {
					case "ArrowUp":this.cam.camd = this.cam.camd - keymag; if(this.cam.camd<0) cthis.am.camd = 0 ; break ;
					case "ArrowDown":this.cam.camd = this.cam.camd + keymag ; break ;
				}				
			} else {
				switch(m.key) {
					case "ArrowLeft":
					case "Left":
					case "h":
						this.vry = -keymag ;
						break ;
					case "ArrowUp":
					case "Up":
					case "k":
						this.vrx = -keymag ;
						break ;
					case "ArrowRight":
					case "Right":
					case "l":
						this.vry = keymag ;
						break ;
					case "ArrowDown":
					case "Down":
					case "j":
						this.vrx = keymag ;
						break ;
				
					case "w":
					case " ":
						md = "u" ; break ;
					case "z":
						md = "d" ;break ;
					case "a":
						md = "l" ;break ;
					case "s":
						md = "r" ;break ;					
				}
			}
			if(md!="") {
				const dir = ((md=="d")?-0.01:0.01)*keymag*scale 
				const cam = this.cam ;
				let ry = cam.camRY ;
				if(md=="l") ry = ry -90 ;
				if(md=="r") ry = ry +90 ;
				this.cam.vcx =  Math.sin(ry*this.RAD) *dir ;
				this.cam.vcz = -Math.cos(ry*this.RAD)* dir ;	
			}
			break ;
		case "keyup":
			this.keydown = false ;
			if(this.gev!==null) {
				this.gx = this.gev.rx - this.cam.camRX ;
				this.gy = this.gev.ry - this.cam.camRY ;
//				console.log(this.gx+"/"+this.gy) ;
			}
			switch(m.key) {
				case "ArrowLeft":
				case "Left":
				case "h":
				case "ArrowRight":
				case "Right":
				case "l":
					this.vry = 0 ; break ;
				case "ArrowUp":
				case "Up":
				case "k":
				case "ArrowDown":
				case "Down":
				case "j":
					this.vrx = 0  ; break ;
				case "w":
				case "z":
				case "a":
				case "s":
				case " ":
					this.cam.vcx = 0 ; this.cam.vcz = 0 ; break ;
				case "Dead": //mobile safari no keyup key
					this.vrx = 0 ; this.vry = 0 ; this.cam.vcx = 0 ; this.cam.vcz = 0 ; 
					break ;
			}			
			break ;	
		}
}
PoxPlayer.prototype.Camera.prototype.update = function(time) {
	if(this.cam.camMode!="fix") {
		this.cam.camRX += this.vrx ;
		if(this.cam.camRX<-89) this.cam.camRX = -89 ; 
		if(this.cam.camRX>89) this.cam.camRX = 89 ; 
		this.cam.camRY += this.vry ;
	}
	if(this.cam.camMode=="walk") {
		this.cam.camCX += this.cam.vcx ;
		this.cam.camCZ += this.cam.vcz ;
	}
}
PoxPlayer.prototype.Camera.prototype.setPad = function(gp) {
//	console.log(gp.buttons)
	this.cam.camRY += gp.faxes[2]
	this.cam.camRX += gp.faxes[3]
	this.cam.camd = gp.faxes[1]*this.poxp.pox.setting.scale *0.1
	if(this.cam.camMode=="walk") {
		let sc = 0.01*this.poxp.pox.setting.scale ;
		let vd = (-gp.axes[1]*sc)

			let ry = this.cam.camRY ;
			this.cam.vcx =  Math.sin(ry*this.RAD) * vd;
			this.cam.vcz = -Math.cos(ry*this.RAD)* vd ;	
		
	}
}
PoxPlayer.prototype.Camera.prototype.getMtx = function(scale,sf) {
	const cam = this.cam ;
	const can = this.render.wwg.can ;
	const dx = sf * cam.sbase * scale ;	// stereo base
	const aspect = can.width/(can.height*((sf)?2:1)) ;
	const ret = {};
//console.log(cam);
//console.log(cam.camRX+"/"+cam.camRY) ;
	let cx,cy,cz,upx,upy,upz,camX,camY,camZ,camd ;
	if(cam.camMode=="fix") {
		cx = cam.camVX ;
		cy = cam.camVY ;
		cz = cam.camVZ ;
		upx = cam.camUPX ;
		upy = cam.camUPY ;
		upz = cam.camUPZ ;
		camX = 0 ,camY = 0, camZ = 0 ;			
	}
	else if(cam.camMode=="vr" || cam.camMode=="walk") {
		// self camera mode 
		cx = Math.sin(cam.camRY*this.RAD)*1*Math.cos(cam.camRX*this.RAD)
		cy = -Math.sin(cam.camRX*this.RAD)*1 ; 
		cz = -Math.cos(cam.camRY*this.RAD)*1*Math.cos(cam.camRX*this.RAD)
		camX = 0 ,camY = 0, camZ = 0 ;
		upx =0 ,upy = 1 ,upz = 0 ;		
	} else {
	// bird camera mode 
		camd=  cam.camd*scale ;
		camX = -Math.sin(cam.camRY*this.RAD)*camd*Math.cos(cam.camRX*this.RAD)
		camY = Math.sin(cam.camRX*this.RAD)*camd ; 
		camZ = Math.cos(cam.camRY*this.RAD)*camd*Math.cos(cam.camRX*this.RAD)
		cx = 0 ,cy = 0, cz = 0 ;
		if(camd<0) {
			cx = camX*2 ;cy = camY*2 ;cz = camZ*2 ;
		}

		upx = 0.,upy = 1 ,upz = 0. ;
	}

	// for stereo
	if(dx!=0) {
		let xx =  upy * (camZ-cz) - upz * (camY-cy);
		let xy = -upx * (camZ-cz) + upz * (camX-cx);
		let xz =  upx * (camY-cy) - upy * (camX-cx);
		const mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
		xx *= dx/mag ; xy *=dx/mag ; xz *= dx/mag ;
//			console.log(dx+":"+xx+"/"+xy+"/"+xz)
		camX += xx ;
		camY += xy ;
		camZ += xz ;
		cx += xx ;
		cy += xy ;
		cz += xz ;
	}
	let camM = new CanvasMatrix4().lookat(camX+cam.camCX,camY+cam.camCY,camZ+cam.camCZ,
	cx+cam.camCX,cy+cam.camCY,cz+cam.camCZ, upx,upy,upz) ;
	if(cam.camAngle!=0) camM = camM.perspective(cam.camAngle,aspect, cam.camNear, cam.camFar)
	else camM = camM.pallarel(cam.camd,aspect, cam.camNear, cam.camFar) ;	
	return {camX:camX,camY:camY,camZ:camZ,camM:camM} ;
}