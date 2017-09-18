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