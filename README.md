# Miratope
A renderer for polytopes. Still in alpha.

## What can Miratope do now?
Miratope can generate the classes of polytopes, among others:
* Simplexes
* Hypercubes
* Orthoplexes
* Product prisms
* Polyhedral antiprisms
* Cupolae, cuploids and cupolaic blends

Miratope can also read and export OFF files.

## FAQ
### How do I use Miratope?
Miratope doesn't have an interface yet, so you'll have to use the Console to write down JavaScript commands.

Most of the cool generating commands are on the `Polytope` class. For example, to generate a uniform octagrammic antiprism and render it to the screen, you can use `Polytope.uniformAntiprism(8, 3).renderTo(mainScene);`.

### Why does my OFF file not render?
Provisionally, your OFF file is being loaded into the variable `P`. You have to manually render it using the command `P.renderTo(mainScene);`.

Note that at the moment, this works only for 3D OFF files, and can be very buggy.

### How do I clear the scene?
Use `mainScene.clear();`.

## What's next?
There are lots of planned features for Miratope, some more ambitious than others. You can look at the complete list, along with some ideas on how to implement them (here)[https://docs.google.com/document/d/1IEoXR4vmOPELFKosRMIDfDN_M4oaUGWDExdqqDpCwfU/edit?usp=sharing].

The most immediate changes will probably be the following:
* Greater camera control
* Vertex and edge toggling
* Projection type change

Longer term but more substantial changes include:
* Localization
* A minimal working interface
* 4D+ rendering
* Different fill types for faces
* Creation of a dedicated file format and a polytope library
* More operations on polytopes 
