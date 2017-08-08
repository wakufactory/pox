GPad = {conn:false} ;

GPad.init = function() {
	if(!navigator.getGamepads) return false ;
	gamepads = navigator.getGamepads();
//	console.log(gamepads)
	if(gamepads[0]) {
		console.log("connected "+0) ;
		GPad.conn = true ;
	}
	addEventListener("gamepadconnected", function(e) {
		console.log("connected "+e.gamepad.index) ;
		console.log(e.gamepad) ;
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
	if(!gp) return null ;
	return gp ;	
}