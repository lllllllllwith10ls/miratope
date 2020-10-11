//A class for operations on points.
var Space = {};
	
//Calculates the intersection of ab with cd.
//Assumes that all points lie on the same plane, but not on the same line.
//Returns null if this does not exist.
//Currently only implemented for Euclidean points, in at least 2D.
Space.intersect = function(a, b, c, d) {
	if(a.dimensions() !== b.dimensions() || a.dimensions() !== c.dimensions() || a.dimensions() !== d.dimensions())
		throw new Error("You can't intersect edges with different amounts of dimensions!");
	
	//First, we calculate the coordinates in which each line segment coordinates change the most.
	//That way, we avoid projecting lines into points.
	//No need to do it in 2D, though.
	var ab_MAX = 0, ab_MAX_indx = 0, cd_MAX = 0, cd_MAX_indx = 1;
	
	if(a.dimensions() !== 2) {		
		for(var i = 0; i < a.dimensions(); i++) {
			var ab = Math.abs(a.coordinates[i] - b.coordinates[i]);
			var cd = Math.abs(c.coordinates[i] - d.coordinates[i]);
			if(ab > ab_MAX){
				ab_MAX = ab;
				ab_MAX_indx = i;
			}
			if(cd > cd_MAX){
				cd_MAX = cd;
				cd_MAX_indx = i;
			}
		}
		
		//If both indices are the same, we can take the second one to be anything different.
		if(ab_MAX_indx === cd_MAX_indx) {
			if(cd_MAX_indx === 0)
				cd_MAX_indx = 1;
			else
				cd_MAX_indx = 0;
		}
	}
		
	//Projects a, b - a, c, d - c onto the a plane.
	//Then, adapts the method from https://stackoverflow.com/a/565282 (by Gareth Rees)
	var p = [a.coordinates[ab_MAX_indx], a.coordinates[cd_MAX_indx]],
	r = [b.coordinates[ab_MAX_indx] - a.coordinates[ab_MAX_indx], b.coordinates[cd_MAX_indx] - a.coordinates[cd_MAX_indx]],
	q = [c.coordinates[ab_MAX_indx], c.coordinates[cd_MAX_indx]],
	s = [d.coordinates[ab_MAX_indx] - c.coordinates[ab_MAX_indx], d.coordinates[cd_MAX_indx] - c.coordinates[cd_MAX_indx]];
	
	//If the two lines' slopes are very similar, do nothing.
	//They either not intersect or are too similar for us to care.
	if(Space.sameSlope(r[0], r[1], s[0], s[1]))
		return null;
	
	var t = ((p[0] - q[0]) * s[1] - (p[1] - q[1]) * s[0])/(r[1] * s[0] - r[0] * s[1]),
	u = ((p[0] - q[0]) * r[1] - (p[1] - q[1]) * r[0])/(r[1] * s[0] - r[0] * s[1]);
	
	//The intersection lies outside of the segments, or at infinity.
	if(!(t > epsilon) || t >= 1 - epsilon || !(u > epsilon) || u >= 1 - epsilon)
		return null;
	
	var pt = [];
	for(var i = 0; i < a.dimensions(); i++)
		pt.push(a.coordinates[i] + (b.coordinates[i] - a.coordinates[i]) * t);
	return new Point(pt);
};
	
//Calculates the angle between b - a and c - a, and check if it's straight to a given precision.
Space.collinear = function(a, b, c) {
	if(Point.equal(a, b) || Point.equal(a, c))
		return true;
	
	var dot = 0;
	var norm0, norm1;
	var sub0, sub1;
	for(var i = 0; i < a.coordinates.length; i++) {
		sub0 = b.coordinates[i] - a.coordinates[i];
		sub1 = c.coordinates[i] - a.coordinates[i];
		dot += sub0 * sub1;
		norm0 += sub0 * sub0;
		norm1 += sub1 * sub1;
	}

	return 1 - Math.abs(dot / Math.sqrt(norm0 * norm1)) <= epsilon;
};

//Returns whether the line from (0, 0) to (a, b) and the line from (0, 0) to (c, d)
//have the same (neglibly different) slopes.
Space.sameSlope = function(a, b, c, d) {
	var s = Math.atan(a / b) - Math.atan(c / d);
	return (s + Math.PI + epsilon) % Math.PI < 2 * epsilon;
};