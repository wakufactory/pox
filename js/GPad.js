GPad = function() {
	this.idx = 0 
	this.conn = false 
}

GPad.prototype.init = function(idx) {
	if(idx==undefined) idx = 0 
	this.idx = idx 
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
//	console.log(gamepads)
	if(gamepads[this.idx]) {
		console.log("gpad connected "+0) ;
		this.axes =gamepads[this.idx].axes 
		this.conn = true ;
		this.egp = null ;
	}
	addEventListener("gamepadconnected", (e)=> {
		console.log("gpad reconnected "+e.gamepad.index) ;
//		console.log(e.gamepad) ;
		this.axes = e.gamepad.axes 
		this.conn = true; 
	})	
	addEventListener("gamepaddisconnected", (e)=> {
		console.log("gpad disconnected "+e.gamepad.index) ;
		this.conn = false ;
	})
	this.lastGp = {
		buttons:[
			{pressed:false},
			{pressed:false}
		],
		axes:[0,0]
	}
	this.egp = {
		buttons:[
			{pressed:false},
			{pressed:false}
		],
		axes:[0,0]
	}
	return true ;
}
GPad.prototype.get = function(pad) {
	var gp 
	if(!this.conn) {
		if(this.egp==null) return null ;	
		gp = this.egp
	} else {
		var gamepads = navigator.getGamepads();
		var gp = gamepads[this.idx];
		if(!gp || gp.buttons.length==0) return null ;
	}
	
	var lgp = this.lastGp 
	gp.bf = false 
	gp.pf = false 
	gp.dbtn = [] 
	gp.dpad = []

//	if(lgp) console.log(lgp.buttons[1].pressed +" "+ gp.buttons[1].pressed)
	for(var i=0;i<gp.buttons.length;i++) {
		gp.dbtn[i] = 0 
		if(lgp) {
			if(!lgp.buttons[i].pressed && gp.buttons[i].pressed) {gp.dbtn[i] = 1; gp.bf=true} 
			if(lgp.buttons[i].pressed && !gp.buttons[i].pressed) {gp.dbtn[i] = -1;gp.bf=true}
		}
		lgp.buttons[i] = {pressed:gp.buttons[i].pressed}
	}

	for(var i=0;i<gp.axes.length;i++) {
		gp.dpad[i] = 0 
		if(lgp) {
			if(lgp.axes[i]==0 && gp.axes[i]!=0) {gp.dpad[i] = (gp.axes[i]>0)?1:-1;gp.pf=true}
			if(lgp.axes[i]!=0 && gp.axes[i]==0) {gp.dpad[i] = (lgp.axes[i]>0)?1:-1;gp.pf=true}
		}
		lgp.axes[i] = gp.axes[i]
	}
	this.gp = gp 
	if(this.ev && (gp.bf || gp.pf)){
		this.ev(gp,gp.dbtn,gp.dpad) 
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
			{pressed:false},
			{pressed:false}
		],
		axes:[0,0]
	}
	this.egp = gp
	this.cf = true ;	
}