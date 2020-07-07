/**
 *	gamepad object 
 *	@constructor 
 */
GPad = function() {
	this.idx = 0 
	this.conn = false 
	this.gpadcount = 0 
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
	this.gpadcount = gamepads.length
	return this.gpadcount > 0  
}

GPad.prototype.init = function(idx,cb) {
	if(idx==undefined) idx = 0 
	this.idx = idx 
	if(!navigator.getGamepads) return false ;
	let ret = true 
	gamepads = navigator.getGamepads();
//	console.log(gamepads)
	if(gamepads[this.idx]) {
		console.log("gpad init "+this.idx) ;
		this.axes =gamepads[this.idx].axes 
		this.conn = false ;
		this.egp = null ;
	} else {
		this.conn = false 
		ret = false 
	}
	addEventListener("gamepadconnected", (e)=> {
		if(e.gamepad.index != this.idx ) return 
		console.log("gpad reconnected "+e.gamepad.index) ;
//		console.log(e.gamepad) ;
		this.axes = e.gamepad.axes 
		this.conn = true; 
		this.get()
		if(cb) cb(this,true) 
	})	
	addEventListener("gamepaddisconnected", (e)=> {
		if(e.gamepad.index != this.idx ) return 
		console.log("gpad disconnected "+e.gamepad.index) ;
		this.conn = false ;
		if(cb) cb(this,false) 
	})
	this.lastGp = {
		buttons:[
			{pressed:false,touched:false},
			{pressed:false,touched:false},
			{pressed:false,touched:false},
			{pressed:false,touched:false},
			{pressed:false,touched:false},
			{pressed:false,touched:false}
		],
		axes:[0,0]
	}
	this.egp = {
		buttons:[
			{pressed:false,touched:false},
			{pressed:false,touched:false}
		],
		axes:[0,0]
	}
	return ret ;
}
GPad.prototype.get = function(pad) {
	var gp 
	if(POXPDevice && POXPDevice.WebXR) {
		this.emu = false 
		if(POXPDevice.isPresenting && POXPDevice.session.inputSources) {
		const is = POXPDevice.session.inputSources
		for (let i=0;i<=is.length-1;i++) {
			if (is[i].gamepad && is[i].gamepad.mapping=="xr-standard") {
				is[i].gamepad.hand = is[i].handedness
				if (is[i].handedness=="left" && this.idx==1) {gp=is[i].gamepad }
				if (is[i].handedness=="right" && this.idx==0) {gp=is[i].gamepad }

				if(gp) {
					let pose = POXPDevice.vrFrame.getPose(is[i].gripSpace,POXPDevice.referenceSpace)
					if(pose) {
						gp.pose = {}
						if(pose.transform.orientation) gp.pose.orientation = [pose.transform.orientation.x,pose.transform.orientation.y,pose.transform.orientation.z,pose.transform.orientation.w]
						if(pose.transform.position) gp.pose.position =  [pose.transform.position.x,pose.transform.position.y,pose.transform.position.z]
//					console.log(pose)
					}
					this.conn = true 
					break 
				} else this.conn = false 					
			}	
		}
		} else this.conn = false 
	} 
	if(!gp) {
		if(this.egp==null) return null ;	
		this.conn = true 
		gp = this.egp
		this.emu = true 
	} 
	var lgp = this.lastGp 
	gp.conn = this.conn 
	gp.emu = this.emu 
	gp.bf = false 
	gp.pf = false 
	gp.tf = false 
	gp.dbtn = [] 
	gp.dpad = []
	gp.dtouch = [] 

//	if(lgp) console.log(lgp.buttons[1].pressed +" "+ gp.buttons[1].pressed)
	for(var i=0;i<gp.buttons.length;i++) {
		gp.dbtn[i] = 0 
		gp.dtouch[i] = 0 
		if(lgp && lgp.buttons[i]) {
			if(!lgp.buttons[i].pressed && gp.buttons[i].pressed) {gp.dbtn[i] = 1; gp.bf=true} 
			if(lgp.buttons[i].pressed && !gp.buttons[i].pressed) {gp.dbtn[i] = -1;gp.bf=true}
			if(!lgp.buttons[i].touched && gp.buttons[i].touched) {gp.dtouch[i] = 1; gp.tf=true} 
			if(lgp.buttons[i].touched && !gp.buttons[i].touched) {gp.dtouch[i] = -1;gp.tf=true}
		}
		lgp.buttons[i] = {pressed:gp.buttons[i].pressed,
											touched:gp.buttons[i].touched}
	}
	const th = 0.5 
	const eps = 0.001 
	let axes = [gp.axes[0],gp.axes[1],gp.axes[2],gp.axes[3]]
	if(gp.axes[2]!==undefined && gp.axes[3]!==undefined) {
		 axes[0] = gp.axes[2]
		 axes[1] = gp.axes[3]
		 gp.stick = true ;
	} else gp.stick = false ;
	
	gp.eaxes = axes 
	for(var i=0;i<axes.length;i++) {
		if(Math.abs(axes[i]) < eps ) gp.axes[i] = 0 
		gp.dpad[i] = 0 
		if(lgp) {
			if(Math.abs(lgp.axes[i])<th && Math.abs(axes[i])>=th) {gp.dpad[i] = 1;gp.pf=true}
			if(Math.abs(lgp.axes[i])>=th && Math.abs(axes[i])<th) {gp.dpad[i] = -1;gp.pf=true}
		}
		lgp.axes[i] = axes[i]
	}
	this.gp = gp 

	if(this.ev && (gp.bf || gp.pf || gp.tf)){
		this.ev(gp) 
	}
//	console.log(gp)
	return gp ;	
}
GPad.prototype.set = function(gp) {//for emulation
	this.egp = gp ;	
}
GPad.prototype.clear = function(gp) {//for emulation
	if(gp==undefined ) gp = {
		buttons:[
			{pressed:false,touched:false},
			{pressed:false,touched:false}
		],
		axes:[0,0]
	}
	this.egp = gp
	this.cf = true ;	
}