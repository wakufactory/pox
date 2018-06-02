GPad = {conn:false} ;

GPad.init = function() {
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
	console.log(gamepads)
	if(gamepads[0]) {
		console.log("gpad connected "+0) ;
		GPad.axes =gamepads[0].axes 
		GPad.conn = true ;
	}
	addEventListener("gamepadconnected", function(e) {
		console.log("gpad reconnected "+e.gamepad.index) ;
		console.log(e.gamepad) ;
		GPad.axes = e.gamepad.axes 
		GPad.conn = true; 
	})	
	addEventListener("gamepaddisconnected", function(e) {
		console.log("disconnected "+e.gamepad.index) ;
		GPad.conn = false ;
	})
	return true ;
}
GPad.get = function(pad) {
	if(!GPad.conn) return null ;
	var gamepads = navigator.getGamepads();
	var gp = gamepads[0];
	if(!gp || gp.buttons.length==0) return null ;
	gp.faxes = [] 
	for(var i=0;i<gp.axes.length;i++) {
		gp.faxes[i] = gp.axes[i] - GPad.axes[i] ;
		if(Math.abs(gp.faxes[i])<0.05) gp.faxes[i] = 0 
	}
	return gp ;	
}