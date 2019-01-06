GPad = {conn:false,gp:null,lastGp:null,egp:null,cf:false,ev:null} ;

GPad.init = function() {
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
//	console.log(gamepads)
	if(gamepads[0]) {
		console.log("gpad connected "+0) ;
		GPad.axes =gamepads[0].axes 
		GPad.conn = true ;
		GPad.egp = null ;
	}
	addEventListener("gamepadconnected", function(e) {
		console.log("gpad reconnected "+e.gamepad.index) ;
//		console.log(e.gamepad) ;
		GPad.axes = e.gamepad.axes 
		GPad.conn = true; 
	})	
	addEventListener("gamepaddisconnected", function(e) {
		console.log("gpad disconnected "+e.gamepad.index) ;
		GPad.conn = false ;
	})
	GPad.lastGp = {
		buttons:[
			{pressed:false},
			{pressed:false}
		],
		axes:[0,0]
	}
	GPad.dbtn = []
	GPad.dpad = []
	return true ;
}
GPad.get = function(pad) {
	var gp 
	if(!GPad.conn) {
		if(GPad.egp==null) return null ;	
		gp = GPad.egp
	} else {
		var gamepads = navigator.getGamepads();
		var gp = gamepads[0];
		if(!gp || gp.buttons.length==0) return null ;
	}
	
	var lgp = GPad.lastGp 
	let bf = false 
	let pf = false 

//	if(lgp) console.log(lgp.buttons[1].pressed +" "+ gp.buttons[1].pressed)
	for(var i=0;i<gp.buttons.length;i++) {
		GPad.dbtn[i] = 0 
		if(lgp) {
			if(!lgp.buttons[i].pressed && gp.buttons[i].pressed) {GPad.dbtn[i] = 1; bf=true} 
			if(lgp.buttons[i].pressed && !gp.buttons[i].pressed) {GPad.dbtn[i] = -1;bf=true}
		}
		lgp.buttons[i] = {pressed:gp.buttons[i].pressed}
	}

	for(var i=0;i<gp.axes.length;i++) {
		GPad.dpad[i] = 0 
		if(lgp) {
			if(lgp.axes[i]==0 && gp.axes[i]!=0) {GPad.dpad[i] = (gp.axes[i]>0)?1:-1;pf=true}
			if(lgp.axes[i]!=0 && gp.axes[i]==0) {GPad.dpad[i] = (lgp.axes[i]>0)?1:-1;pf=true}
		}
		lgp.axes[i] = gp.axes[i]
	}
	GPad.gp = gp 
	if(GPad.ev && (bf || pf)){
//		console.log(dbtn)
		GPad.ev(gp,GPad.dbtn,GPad.dpad) 
	}
	return gp ;	
}
GPad.set = function(gp) {//for emulation
	GPad.egp = gp ;	
}
GPad.clear = function(gp) {//for emulation
	GPad.egp = gp
	GPad.cf = true ;	
}