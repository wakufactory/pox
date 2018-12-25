GPad = {conn:false,gp:null,egp:null,cf:false} ;

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
	GPad.dpad = {buttons:[{pressed:0},{pressed:0}],axes:[]}
	return true ;
}
GPad.get = function(pad) {
	if(!GPad.conn) {	
		GPad.lastGp = GPad.gp ;
		GPad.gp = GPad.egp ;
		if(GPad.cf) {
			GPad.egp = GPad.dpad ;
			GPad.cf = false ;
		}
		return GPad.gp ;
	}
	var gamepads = navigator.getGamepads();
	var gp = gamepads[0];
	if(!gp || gp.buttons.length==0) return null ;
	
	var sgp = {
		buttons:[],
		axes:[],
		faxes:[],
		id:gp.id,
		hand:gp.hand,
		pose:gp.pose
	}
	for(var i=0;i<gp.buttons.length;i++) {
		sgp.buttons[i] = {pressed:gp.buttons[i].pressed}
	}
	for(var i=0;i<gp.axes.length;i++) {
		sgp.axes[i] = gp.axes[i]
		sgp.faxes[i] = gp.axes[i] - GPad.axes[i] ;
		if(Math.abs(sgp.faxes[i])<0.01) sgp.faxes[i] = 0 
	}
	GPad.lastGp = GPad.gp ;
	GPad.gp = sgp ;
	return sgp ;	
}
GPad.set = function(gp) {//for emulation
	GPad.egp = gp ;	
}
GPad.clear = function(gp) {//for emulation
	GPad.egp = gp
	GPad.cf = true ;	
}