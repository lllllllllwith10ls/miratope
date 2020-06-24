"use strict";

//Represents a polytope as a convex hull.
//Will be merged with PolytopeC.
class PolytopeV extends Polytope {
	constructor(vertices, dimensions) {
		super();
		this.vertices = vertices;
		this.dimensions = dimensions; //Is not necessarily the number of dimensions of the vertices!
	}
	
	//Calculates the centroid as the average of the vertices.
	centroid() {
		var res = this.vertices[0].clone();
		for(var i = 1; i < this.vertices.length; i++)
			res.add(this.vertices[i]);
		res.divideBy(this.vertices.length);
		return res;
	}
}

//Represents a polytope as a list of elements, in ascending order of dimensions, similar to (but not the same as) an OFF file.
//We don't only store the facets, because we don't want to deal with O(2^n) code.
//Subelements stored as indices.
//All points assumed to be of the same dimension.
class PolytopeC extends Polytope {
	constructor(elementList) {
		super();
		this.elementList = elementList;
		this.dimensions = elementList.length - 1; //The combinatorial dimension.
		this.spaceDimensions = this.elementList[0][0].dimensions(); //The space's dimension.
		this.name = "Polytope"; //Polytope is just a placeholder name.
	}
	
	//Builds a hypercube in the specified amount of dimensions.
	//Positioned in the standard orientation with edge length 1.
	static hypercube(dimensions) {
		var els = []; //Elements is a reserved word.
		for(var i = 0; i <= dimensions; i++)
			els.push([]);
		//Mapping from pairs of the indices below to indices of the corresponding els.
		var locations = {};
		//i and i^j are the indices of the vertices of the current subelement.
		//i^j is used instead of j to ensure that facets of els
		//are generated before the corresponding element.
		for(var i = 0; i < 2 ** dimensions; i++) {
			for(var j = 0; j < 2 ** dimensions; j++) {
				//If the indices are the same, this is a vertex
				if(i == 0) {
					var coordinates = [];
					for(var k = 1; k <= dimensions; k++) 
						coordinates.push(j % (2 ** k) < 2 ** (k - 1) ? 0.5 : -0.5);
					locations[j] = {0:els[0].length};
					els[0].push(new Point(coordinates));
					continue;
				}
				//To avoid redundancy, i^j should be >=i using the obvious partial ordering on bitstrings.
				//This is equivalent to i and j being disjoint
				if((j & i) != 0)
					continue;
				//Everything else is a higher-dimensional element
				var elementDimension = 0;
				var difference = i;
				var differences = [];
				while(difference > 0) {
					elementDimension++;
					differences.push(difference & ~(difference - 1));
					difference = difference & (difference - 1);
				}
				var facets = [];
				//facets connected to i
				for(var k = 0; k < differences.length; k++)
					facets.push(locations[j][i ^ differences[k]]);
				//facets connected to i^j
				for(var k = 0; k < differences.length; k++)
					facets.push(locations[j ^ differences[k]][i ^ differences[k]]);
				locations[j][i] = els[elementDimension].length;
				els[elementDimension].push(facets);
			}
		}

		return new PolytopeC(els);
	}
	
	//Builds a simplex in the specified amount of dimensions.
	//Implements the more complicated coordinates in the space of the same dimension.
	static simplex(dimensions) {
		var vertices = [];
		var aux = [Infinity]; //Memoizes some square roots, tiny optimization.
		for(var i = 1; i <= dimensions; i++) 
			aux.push(1/Math.sqrt(2 * i * (i + 1)));
		
		for(var i = 0; i <= dimensions ; i++) {
			var coordinates = [];
			for(var j = 1; j <= dimensions; j++) {
				if(j > i)
					coordinates.push(-aux[j]);
				else if(j === i)
					coordinates.push(j*aux[j]);
				else
					coordinates.push(0);
			}
			vertices.push(new Point(coordinates));
		}

		var els = [vertices];
		for(var i = 1; i <= dimensions; i++)
			els.push([]);
		var locations = {};
		for(var i = 0; i < dimensions + 1; i++)
			locations[2 ** i] = i;
		for(var i = 1; i < 2**(dimensions + 1); i++) {
			//Vertices were generated earlier
			if (!(i & (i - 1)))
				continue;
			var elementDimension = -1;
			var t = i;
			var elemVertices = [];
			while(t > 0) {
				elementDimension++;
				elemVertices.push(t & ~(t - 1));
				t = t & (t - 1);
			}
			var facets = [];
			for(var k = 0; k < elemVertices.length; k++)
				facets.push(locations[i ^ elemVertices[k]]);
			locations[i] = els[elementDimension].length;
			els[elementDimension].push(facets);
		}
		
		return new PolytopeC(els);
	}
	
	//Builds a cross-polytope in the specified amount of dimensions.
	//Positioned in the standard orientation with edge length 1.
	static cross(dimensions) {
		//i is the set of nonzero dimensions, j is the set of negative dimensions
		var els = [];
		for(var i = 0; i <= dimensions; i++)
			els.push([]);
		var locations = {};
		//The full polytope is best handled separately
		for(var i = 1; i < 2 ** dimensions; i++) {
			for(var j = 0; j < 2 ** dimensions; j++) {
				//No negative zero dimensions
				if((i & j) != j)
					continue;
				if(!j)
					locations[i] = {};
				if(!(i & (i - 1))) {
					var coordinates = [];
					var sign = j ? -1 : 1;
					for(var k = 0; k < dimensions; k++) 
						coordinates.push((2 ** k) == i ? sign * Math.SQRT1_2 : 0);
					locations[i][j] = els[0].length;
					els[0].push(new Point(coordinates));
					continue;
				}
				var elementDimension = -1;
				var t = i;
				var elemVertices = [];
				while(t > 0) {
					elementDimension++;
					elemVertices.push(t & ~(t - 1));
					t = t & (t - 1);
				}
				var facets = [];
				for(var k = 0; k < elemVertices.length; k++)
					facets.push(locations[i ^ elemVertices[k]][j & ~elemVertices[k]]);
				locations[i][j] = els[elementDimension].length;
				els[elementDimension].push(facets);
			}
		}
		var facets = [];
		for(var i = 0; i < els[dimensions - 1].length; i++) {
			facets.push(i);
		}
		els[dimensions].push(facets);
		
		return new PolytopeC(els);
	}
	
	//Calculates the centroid as the average of the vertices.
	//Could be made more efficient replacing the add method with direct calculations with arrays.
	centroid() {		
		var res = this.elementList[0][0].clone();
		for(var i = 1; i < this.elementList[0].length; i++)
			res.add(this.elementList[0][i]);
		res.divideBy(this.elementList[0].length);
		return res;
	}
	
	//Builds a Grünbaumian n/d star.
	static star(n, d) {
		if(d === undefined)
			d = 1;
		
		var els = [[], [], [[]]],
		i;
		
		for(i = 0; i < n; i++) {
			var angle = 2 * Math.PI * i * d / n + 0.01 //REMOVE LAST NUMBER, THIS IS JUST FOR TESTING
			els[0].push(new Point([Math.cos(angle), Math.sin(angle)])); //Vertices
			els[2][0].push(i); //Face.
		}
		
		for(i = 0; i < n - 1; i++)
			els[1].push([i, i + 1]);	//Edges
		els[1].push([els[0].length - 1, 0]);
		
		return new PolytopeC(els);
	}

	//Makes every vertex have dim coordinates either by adding zeros or removing numbers.
	setSpaceDimensions(dim) {
		for(var i = 0; i < this.elementList[0].length; i++) {
			if(this.elementList[0][i].coordinates.length > dim)
				this.elementList[0].coordinates = this.elementList[0].coordinates.slice(0, dim);
			else if(this.elementList[0][i].coordinates.length < dim)
				for(var j = 0; j < dim - this.elementList[0][i].coordinates.length; j++)
					this.elementList[0][i].coordinates.push(0);
		}
		this.spaceDimensions = dim;
	}
	
	//The name for an i-element, according to http://os2fan2.com/gloss/pglosstu.html.
	//Works for up to 20 dimensions, we very probably don't need more than that.
	static elementName(i, plural) {
		switch(i) {
			case 0:
				if(plural) return "Vertices"; return "Vertex";
			case 1:
				if(plural) return "Edges"; return "Edge";
			case 2:
				if(plural) return "Faces"; return "Face";
			case 3:
				if(plural) return "Cells"; return "Cell";
			case 4:
				if(plural) return "Tera"; return "Teron";
			case 5:
				if(plural) return "Peta"; return "Peton";
			case 6:
				if(plural) return "Exa"; return "Exon";
			case 7:
				if(plural) return "Zetta"; return "Zetton";
			case 8:
				if(plural) return "Yotta"; return "Yotton";
			case 9:
				if(plural) return "Xenna"; return "Xennon";
			case 10:
				if(plural) return "Daka"; return "Dakon";
			case 11:
				if(plural) return "Hendaka"; return "Hendakon";
			case 12:
				if(plural) return "Doka"; return "Dokon";
			case 13:
				if(plural) return "Tradaka"; return "Tradakon";
			case 14:
				if(plural) return "Teradaka"; return "Teradakon";
			case 15:
				if(plural) return "Petadaka"; return "Petadakon";
			case 16:
				if(plural) return "Exdaka"; return "Exdakon";
			case 17:
				if(plural) return "Zettadaka"; return "Zettadakon";
			case 18:
				if(plural) return "Yottadaka"; return "Yottadakon";
			case 19:
				if(plural) return "Xendaka"; return "Xendakon";
			case 20:
				if(plural) return "Ica"; return "Icon";				
			default:
				if(plural) return i + "-elements"; return i + "-element";
		}
	}
	
	//Converts the edge representation of the i-th face to an ordered array of vertices.
	faceToVertices(i) {
		//Enumerates the vertices in order.
		//A doubly linked list does the job easily.
		var vertexDLL = [];
		for(var j = 0; j < this.elementList[2][i].length; j++) {
			var edge = this.elementList[1][this.elementList[2][i][j]];
			if(vertexDLL[edge[0]] === undefined)
				vertexDLL[edge[0]] = new DLLNode(edge[0]);
			if(vertexDLL[edge[1]] === undefined)
				vertexDLL[edge[1]] = new DLLNode(edge[1]);
			
			vertexDLL[edge[0]].linkTo(vertexDLL[edge[1]]);				
		}			
		
		//Cycle of vertex indices.
		//"this.elementList[1][this.elementList[2][i][0]][0]" is just some vertex index.
		return vertexDLL[this.elementList[1][this.elementList[2][i][0]][0]].getCycle();
	}
	
	//Converts the edge representation of a face to an ordered array of vertices.
	//Meant only for a polygon, for which the above code doesn't work.
	faceToVertices2D() {
		//Enumerates the vertices in order.
		//A doubly linked list does the job easily.
		var vertexDLL = [];
		for(var i = 0; i < this.elementList[1].length; i++) {
			var edge = this.elementList[1][i];
			if(vertexDLL[edge[0]] === undefined)
				vertexDLL[edge[0]] = new DLLNode(edge[0]);
			if(vertexDLL[edge[1]] === undefined)
				vertexDLL[edge[1]] = new DLLNode(edge[1]);
			
			vertexDLL[edge[0]].linkTo(vertexDLL[edge[1]]);				
		}			
		
		//Cycle of vertex indices.
		var res= vertexDLL[0].getCycle();
		return res;
	}
	
	//Extrudes a polytope to a pyramid with an apex at the specified point.
	//Constructs pyramids out of elements recursively.
	//The ith n-element in the original polytope gets extruded to the 
	//(i+[(n+1)-elements in the original polytope])th element in the new polytope.
	extrudeToPyramid(apex) {
		var els, i;
		this.dimensions++;
		this.elementList.push([]);
		
		var oldElNumbers = [];
		for(i = 0; i <= this.dimensions; i++)
			oldElNumbers.push(this.elementList[i].length);
		
		//Adds apex.
		this.elementList[0].push(apex);		
		this.setSpaceDimensions(Math.max(apex.dimensions(), this.spaceDimensions));
		
		//Adds edges.
		for(i = 0; i < oldElNumbers[0]; i++)
			this.elementList[1].push([i, oldElNumbers[0]]);
		
		//Adds remaining elements.
		for(var d = 2; d <= this.dimensions; d++) {
			for(i = 0; i < oldElNumbers[d - 1]; i++) {
				els = [i];
				for(var j = 0; j < this.elementList[d - 1][i].length; j++)
					els.push(this.elementList[d - 1][i][j] + oldElNumbers[d - 1]);
				this.elementList[d].push(els);
			}
		}
	}
	
	saveAsOFF(comments) {
		var i, j, coord, vertices;
		
		if(this.spaceDimensions > this.dimensions) {
			//Maybe automatically project the polytope?
			alert("The OFF format does not support polytopes in spaces with more dimensions than themselves.");
			return;
		}
		//The contexts of the OFF file, as an array of plaintext strings.
		var data = [];
		
		//Writes the element counts, and optionally, leaves a comment listing their names in order.
		switch(this.dimensions) {
			case 0: //LOL
				data.push("0OFF");
				break;
			case 1: //Also LOL
				data.push("1OFF\n");
				if(comments)
					data.push("# Vertices\n");
				data.push(this.elementList[0].length + "\n");
				break;
			case 2:
				data.push("2OFF\n");
				if(comments)
					data.push("# Vertices, Edges\n");
				data.push(this.elementList[0].length + " ");
				data.push(this.elementList[1].length + "\n");
				break;
			case 3:
				data.push("OFF\n"); //For compatibility.
				if(comments)
					data.push("# Vertices, Faces, Edges\n");
				data.push(this.elementList[0].length + " ");
				data.push(this.elementList[2].length + " ");
				data.push(this.elementList[1].length + "\n");
				break;
			default:
				data.push(this.dimensions);
				data.push("OFF\n");
				if(comments) {
					data.push("# Vertices, Faces, Edges, Cells");
					for(i = 4; i < this.dimensions; i++)
						data.push(", " + PolytopeC.elementName(i, true));
					data.push("\n");
				}
				data.push(this.elementList[0].length + " ");
				data.push(this.elementList[2].length + " ");
				data.push(this.elementList[1].length + " ");
				for(i = 3; i < this.dimensions - 1; i++)					
					data.push(this.elementList[i].length + " ");
				data.push(this.elementList[this.dimensions - 1].length + "\n");
		}
		
		//Adds vertices. Fills in zeros if spaceDimensions < dimensions.
		if(this.dimensions === 1 || this.dimensions >= 3) {
			if(comments)
				data.push("\n# Vertices\n");
			for(i = 0; i < this.elementList[0].length; i++) {
				for(j = 0; j < this.dimensions - 1; j++) {
					coord = this.elementList[0][i].coordinates[j];
					if(coord === undefined)
						data.push("0 ");
					else
						data.push(coord + " ");
				}
				coord = this.elementList[0][i].coordinates[this.dimensions - 1];
				if(coord === undefined)
					data.push("0\n");
				else
					data.push(coord + "\n");
			}
		}
		//In this special case, the vertices need to be in order.
		else if(this.dimensions === 2) {
			vertices = this.faceToVertices2D();
			if(comments)
				data.push("\n# Vertices\n");
			for(i = 0; i < this.elementList[0].length; i++) {
				coord = this.elementList[0][vertices[i]].coordinates[0];
				if(coord === undefined)
					data.push("0 ");
				else
					data.push(coord + " ");
				
				coord = this.elementList[0][vertices[i]].coordinates[1];
				if(coord === undefined)
					data.push("0\n");
				else
					data.push(coord + "\n");
			}
		}
		
		//Adds faces.
		if(this.dimensions >= 3) {
			if(comments)
				data.push("\n# Faces\n");
			for(i = 0; i < this.elementList[2].length; i++) {
				vertices = this.faceToVertices(i);
				data.push(this.elementList[2][i].length);
				for(j = 0; j < this.elementList[2][i].length; j++)
					data.push(" " + vertices[j]);
				data.push("\n");
			}
		}
			
		//Adds the rest of the elements.
		for(var d = 3; d < this.dimensions; d++) {
			if(comments) {
				data.push("\n# ");
				data.push(PolytopeC.elementName(d, true));
				data.push("\n");
			}
			for(i = 0; i < this.elementList[d].length; i++) {
				data.push(this.elementList[d][i].length);
				for(j = 0; j < this.elementList[d][i].length; j++)
					data.push(" " + this.elementList[d][i][j]);
				data.push("\n");
			}
		}
		
		var blob = new Blob(data, {type: "text/plain"});
		var a = document.getElementById("download");
		a.href = window.URL.createObjectURL(blob);
		a.download = this.name + ".off";
		a.click();
		window.URL.revokeObjectURL(a.href);
	}
	
	//Made with 3D polyhedra in mind.
	//Will probably have to implement other more complicated stuff for other dimensions.
	//Implements Bentley-Ottmann, based on the implementation at
	//http://geomalgorithms.com/a09-_intersect-3.html#Bentley-Ottmann-Algorithm
	//combined with the simplification algorithm at
	//https://web.archive.org/web/20100805164131if_/http://www.cis.southalabama.edu/~hain/general/Theses/Subramaniam_thesis.pdf	
	//to triangulate general polygons.
	//NOT YET FULLY IMPLEMENTED!
	renderTo(scene) {
		function debug() {
			var x = 0;
			console.log(E.value.coordinates[indx0].toString());
			console.log(SL.toString());
		}
		
		//Orders two points lexicographically based on the coordinates on indices 0 and 1.
		//Uses the IDs of the vertices to order them consistently if their coordinates are identical.
		function order(a, b) {
			var c = a.value.coordinates[indx0] - b.value.coordinates[indx0];
			if(c === 0) {
				c = a.value.coordinates[indx1] - b.value.coordinates[indx1];
				if(c === 0)
					return a.id - b.id;
			}
			return c;
		}
		
		//SL is sorted by the height of the edges' intersections with the sweepline.
		//If these are equal, the lines are sorted by slope.
		//If both are equal, the lines are consistently ordered by their IDs (unique, immutable identifiers).
		function SLSort(x, y){
			//This is the only case where the function should return 0:
			if(x.leftVertex === y.leftVertex && x.rightVertex() === y.rightVertex())
				return 0;
			
			var a = x.leftVertex.value,
			b = x.rightVertex().value,
			c = y.leftVertex.value,
			d = y.rightVertex().value,
			k = E.value.coordinates[indx0], slopeMod;
			
			//Calculates where in the segments the intersection with the sweepline lies.
			var lambda0 = (k - b.coordinates[indx0])/(a.coordinates[indx0] - b.coordinates[indx0]);		
			var lambda1 = (k - d.coordinates[indx0])/(c.coordinates[indx0] - d.coordinates[indx0]);
			
			//The height difference between the intersections.
			var res = (a.coordinates[indx1] * lambda0 + b.coordinates[indx1] * (1 - lambda0)) - (c.coordinates[indx1] * lambda1 + d.coordinates[indx1] * (1 - lambda1));
			
			//If the intersections are the same:
			//Maybe we should replace this by "if res is close to zero", and the lambdas to "is close to 0 or 1"?
			if (res === 0) {	
				//If the first edge starts at a point, and the second ends at that point, the former gets sorted after the latter.
				if(lambda0 === 1 && lambda1 === 0)
					return 1;
				//And viceversa.
				if(lambda0 === 0 && lambda1 === 1)
					return -1;
				
				//If both edges start at the same point, sort by increasing slope.
				if(lambda0 === 1)
					slopeMod = 1;				
				//If both edges end at the same point, sort by decreasing slope.
				else
					slopeMod = -1;
				
				//lambda0, lambda1 are recycled as slopes.
				//These shouldn't be NaNs, that case is handled separately in the main code.
				lambda0 = (a.coordinates[indx1] - b.coordinates[indx1])/(a.coordinates[indx0] - b.coordinates[indx0]);
				lambda1 = (c.coordinates[indx1] - d.coordinates[indx1])/(c.coordinates[indx0] - d.coordinates[indx0]);
				
				//The difference between the slopes.
				res = slopeMod * (lambda0 - lambda1);
				
				//If both lines are the same, might as well compare using indices.
				if(res === 0)
					return x.id - y.id;
			}
			return res;
		};
			
		var j, k;
		
		//For each face:
		faceLoop:
		for(var i = 0; i < this.elementList[2].length; i++){
			//Enumerates the vertices in order.
			var cycle = this.faceToVertices(i);
			
			//Makes a doubly-linked list vertexDLL for the polygon's vertices and the new vertices created.
			//node0 is always the "next" vertex.
			var vertexDLL = [new DLLNode(this.elementList[0][cycle[0]])];
			for(j = 0; j < cycle.length - 1; j++) {
				vertexDLL[j + 1] = new DLLNode(this.elementList[0][cycle[j + 1]]);			
				vertexDLL[j].linkToNext(vertexDLL[j + 1]);
			}						
			vertexDLL[vertexDLL.length - 1].linkToNext(vertexDLL[0]);
			
			//Tries to find two non-equal points. If all points are the same, doesn't render the face.
			var a = 1;
			while(Point.equal(vertexDLL[0].value, vertexDLL[a].value))
				if(a++ >= vertexDLL.length)
					continue faceLoop;
			
			//Tries to find three non-collinear points. If all points are collinear, doesn't render the face.
			var b = (a == 1 ? 2 : 1);
			while(Space.collinear(vertexDLL[0].value, vertexDLL[a].value, vertexDLL[b].value))
				if(b++ >= vertexDLL.length)
					continue faceLoop;
			
			//Calculates the coordinates such that the projection of our three non-collinear points onto their 2D plane has the highest area.
			//Uses the shoelace formula.
			//Stores such coordinates' indices in indx0, indx1.
			var maxArea = 0, indx0 = 0, indx1 = 1;
			for(j = 0; j < vertexDLL[0].value.dimensions(); j++) {
				for(k = j + 1; k < vertexDLL[0].value.dimensions(); k++) {
					if(vertexDLL[0].value.coordinates[j] * (vertexDLL[a].value.coordinates[k] - vertexDLL[b].value.coordinates[k])
					+ vertexDLL[a].value.coordinates[j] * (vertexDLL[b].value.coordinates[k] - vertexDLL[0].value.coordinates[k])
					+ vertexDLL[b].value.coordinates[j] * (vertexDLL[0].value.coordinates[k] - vertexDLL[a].value.coordinates[k])
					> maxArea) {
						indx0 = j;
						indx1 = k;
					}						
				}
			}
			
			//Event queue for Bentley-Ottmann, stores vertices.
			//Sorts EQ by lexicographic order of the vertices (EQ is read backwards at the moment).
			
			var EQ = new AvlTree(order);
			for(j = 0; j < vertexDLL.length; j++)
				EQ.insert(vertexDLL[j]);

			//Sweep line for Bentley-Ottmann, as an object with properties leftVertex and rightVertexIndex.
			//rightVertexIndex should be 0 if leftVertex.node0.value is to the right of leftVertex.value, 1 if leftVertex.node1.value is.
			//This format is useful because an edge on the sweep line can only be cut to the right.
			//That way, we don't need to modify the SL objects after the division process: only the nodes' connections change.
			
			var SL = new AvlTree(SLSort);

			//Bentley-Ottmann:
			while(!EQ.isEmpty()) {				
				var E = EQ.findMinimum(); //The next "event" in the event queue.
				EQ.delete(E);
				
				//Runs this code on both edges adjacent to E's vertex.
				for(j = 0; j <= 1; j++) {
					var edge; //E's edge in the SL format.
					var ord = E.value.coordinates[indx0] - E.getNode(j).value.coordinates[indx0];
					var pos = 0;
					var node, prevNode, nextNode;
					
					//Vertex E is a left endpoint of the edge:
					if(ord < 0) {
						edge = new SLEdge(E, j);
						node = SL.insert(edge);
						if(!node) {
							console.log("SL insertion failed! This isn't supposed to happen!");
							console.log("Edge searched for: "+edge.toString());
							console.log("Debug stuff:");
							debug();
						}
						prevNode = SL.prev(node);
						nextNode = SL.next(node);
						
						if(prevNode)
							PolytopeC.divide(edge, prevNode.key, vertexDLL, EQ); //Checks for an intersection with the edge below edgeE.
						if(nextNode)
							PolytopeC.divide(edge, nextNode.key, vertexDLL, EQ); //Checks for an intersection with the edge above edgeE.
					}
					//Vertex E is a right endpoint of the edge:
					else if (ord > 0) {
						edge = new SLEdge(E.getNode(j), 1 - j);
						
						//Deletes edge from the sweep line.
						node = SL.getNode(edge);
						if(!node) {
							console.log("SL retrieval failed! This isn't supposed to happen!");
							console.log("Edge searched for: "+edge.toString());
							console.log("Debug stuff:");
							debug();
						}
						prevNode = SL.prev(node);
						nextNode = SL.next(node);
						
						if(prevNode && nextNode)
							PolytopeC.divide(prevNode.key, nextNode.key, vertexDLL, EQ); //Checks for an intersection between the edges below and above edgeE.
						SL.delete(edge);
					}
					//The edge is perpendicular to the first coordinate's axis:
					//Runs only once per such an edge.
					else if(E.value.coordinates[indx1] > E.getNode(j).value.coordinates[indx1]) {
						edge = new SLEdge(E, j);
					
						//I really should only check intersections with segments at the "correct height".
						node = SL.findMinimumNode();
						while(node) {
							PolytopeC.divide(edge, node.key, vertexDLL, EQ);
							node = SL.next(node);
						}
					}
				}
			}			
			
			//Polygons as ordered sets of vertices.
			var polygons = [];
			
			//Retrieves polygonal paths from edges.
			//Could be optimized somewhat, I think (do we need to traverse the list twice?), but I first need to check that it works in concept.
			for(j = 0; j < vertexDLL.length; j++) {
				if(!vertexDLL[j].traversed)
					polygons.push(vertexDLL[j].getCycle());
			}
			console.log(polygons);
		}		
	}
	
	//renderTo helper function.
	//"Cuts" edgeA and edgeB at the intersection point, adds the new directed edges according to the simplification algorithm.
	//Edges are in the SL format.
	static divide(edgeA, edgeB, vertexDLL, EQ) {
		//No point in doing anything if the intersection has already been dealt with.
		//...what happens if two different vertices take the same location?
		if(edgeA.leftVertex.value === edgeB.leftVertex.value || edgeA.leftVertex.value === edgeB.rightVertex().value ||
		edgeA.rightVertex().value === edgeB.leftVertex.value || edgeA.rightVertex().value === edgeB.rightVertex().value)
			return;
		
		//Converts edges from the SL format to the [vertex1, vertex2] directed edge format.
		var edgeADir, edgeBDir;
		if(edgeA.rightVertexIndex === 0)
			edgeADir = [edgeA.leftVertex, edgeA.leftVertex.node0];
		else
			edgeADir = [edgeA.leftVertex.node1, edgeA.leftVertex];		
		if(edgeB.rightVertexIndex === 0)
			edgeBDir = [edgeB.leftVertex, edgeB.leftVertex.node0];
		else
			edgeBDir = [edgeB.leftVertex.node1, edgeB.leftVertex];		
		
		//No point in doing anything if the intersection is non-existent.
		var inter = Space.intersect(edgeADir[0].value, edgeADir[1].value, edgeBDir[0].value, edgeBDir[1].value);
		if(inter === null) 
			return;
		
		//Add the intersection and a point at "infinitesimal distance" to the vertex list.
		//They don't actually have to be different in this implementation of the algorithm.
		//In fact, the algorithm (as implemented) will fail if both nodes don't reference the same point.
		var newNode1 = new DLLNode(inter); var newNode2 = new DLLNode(inter);
		vertexDLL.push(newNode1); vertexDLL.push(newNode2);
		
		//Re-links the vertices.
		edgeADir[0].linkToNext(newNode1);
		newNode1.linkToNext(edgeBDir[1]);
		edgeBDir[0].linkToNext(newNode2);
		newNode2.linkToNext(edgeADir[1]);
		
		//Adds the edges' new IDs to the redirect table, so that they remain equal and consistent.
		edgeA.updateID();
		edgeB.updateID();
		
		EQ.insert(newNode1);
		EQ.insert(newNode2);
	}
}

//Helper class for renderTo, used in the sweep line for Bentley-Ottmann.
//Encodes an object with properties leftVertex and rightVertexIndex.
//rightVertexIndex should be 0 if leftVertex.node0.value is to the right of leftVertex.value, 1 if leftVertex.node1.value is.
//This format is useful because an edge on the sweep line can only be cut to the right.
//That way, we don't need to modify the SL objects after the division process: only the nodes' connections change.
class SLEdge {	
	constructor(leftVertex, rightVertexIndex) {
		this.leftVertex = leftVertex;
		this.rightVertexIndex = rightVertexIndex;
		
		//Gives the edge an immutable ID in terms of its vertices.
		//Uses the redirect table (read below).
		var x = this.leftVertex.id;
		var y = this.rightVertex().id;
		var newID = (x + y) * (x + y + 1) / 2 + y;
		this.id = (SLEdge.redirectTable[newID] === undefined ? newID : SLEdge.redirectTable[newID]);
	}
		
	rightVertex() {
		return this.leftVertex.getNode(this.rightVertexIndex);
	}
	
	//An edge's ID must be immutable, even if the vertices themselves change, so that sorting can occur consistently.
	//At the same time, it needs to be uniquely identified from the vertices, so searches can occur.
	//To be able to do both things, I use a "redirect table".
	//If the left vertex of an edge changes, I "redirect" the new calculated ID to the old one.
	static redirectTable = [];
	
	updateID() {
		var x = this.leftVertex.id;
		var y = this.rightVertex().id;
		var newID = (x + y) * (x + y + 1) / 2 + y;
		SLEdge.redirectTable[newID] = this.id;
	}	
	
	//TO DELETE.
	//Used for debugging purposes.
	toString(){
		return "([" + this.leftVertex.value.coordinates.toString() +"], ["+this.rightVertex().value.coordinates.toString()+"])";
	}
}