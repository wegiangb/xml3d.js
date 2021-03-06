function NotifyingAdapterFactory() {
    XML3DTestLib.Adapter.NodeAdapterFactory.call(this, "test");
    var that = this;
    this.name = "test";
    this.event = null;
    this.type = "NotifyingAdapterFactory";
    this.createAdapter = function () {
        return {
            init: function () {
            },
            attributeChangedCallback: function (name, oldValue, newValue) {
                that.event = {
                    name : name,
                    oldValue: oldValue,
                    newValue: newValue
                };
                ok(true, "Adapter notified: " + name);
            },
            notifyChanged: function (e) {
                that.event = e;
                ok(true, "Adapter notified: " + e);
            }
        };
    };
};
XML3D.createClass(NotifyingAdapterFactory, XML3DTestLib.Adapter.NodeAdapterFactory);
var Events = XML3DTestLib.Events;

module("Element notification tests", {
    factory : new NotifyingAdapterFactory()
});

test("Factory test", 2, function() {
    ok(this.factory, "This factory exists.");
    this.factory.createAdapter().notifyChanged({});
});

test("Event attribute notification tests", 5, function() {
    var e = document.createElementNS(XML3D.xml3dNS, "xml3d");
    var a = this.factory.getAdapter(e);
    ok(a, "Adapter created"); // 1
    e.setAttribute("onclick", "alert('Hallo');"); // 2. Adapter notified
    XML3D.flushDOMChanges();
    var evt = this.factory.event;
    //console.dir(evt);
    ok(evt, "Event has been thrown"); // 3
    equal(evt.name, "onclick", "MutationEvent::attrName set"); // 6
    e.onclick = function() {}; // Adapter Notified (Not anymore!)
    XML3D.flushDOMChanges();
    equal(evt.name, "onclick", "MutationEvent::attrName"); // 8
});

test("Int attribute notifcation tests", 2, function() {
    e = document.createElementNS(XML3D.xml3dNS, "xml3d");
    var a = this.factory.getAdapter(e);
    e.setAttribute("width", "123");
    e.width = 300;
    XML3D.flushDOMChanges();
});

test("Float attribute notification tests", 2, function() {
    var e = document.createElement("float");
    var a = this.factory.getAdapter(e);
    e.setAttribute("key", "0.5");
    e.key = 0.87;
    XML3D.flushDOMChanges();
});

test("Boolean attribute notification tests", 2, function() {
    e = document.createElement("float");
    var a = this.factory.getAdapter(e);
    e.setAttribute("param", "true");
    e.param = false;
    XML3D.flushDOMChanges();
});

test("XML3DVec attribute notification tests", 2, function() {
    var e = document.createElementNS(XML3D.xml3dNS, "transform");
    var a = this.factory.getAdapter(e);
    e.setAttribute("scale", "1 2 3");
    e.scale = XML3D.math.vec3.fromValues(1,1,1);
    XML3D.flushDOMChanges();
});

test("XML3DRotation attribute notification tests", 2, function() {
    var e = document.createElementNS(XML3D.xml3dNS, "transform");
    var a = this.factory.getAdapter(e);
    e.setAttribute("rotation", "1 0 0 3.14");
    e.rotation = XML3D.math.vec4.fromValues(1, 0, 0, 4);
    XML3D.flushDOMChanges();
});

test("Enumeration attribute notification tests", 5, function() {
    // Behavior copied from HTMLInputElement::type
    var e = document.createElementNS(XML3D.xml3dNS, "texture");
    var a = this.factory.getAdapter(e);
    // Attribute not set
    e.type = "3d";
    e.type = "1D";
    e.setAttribute("type", "3D"); // case insensitive
    e.setAttribute("type", "1d");
    e.setAttribute("type", "asdf"); // invalid
    XML3D.flushDOMChanges();
});

module("Composed Element notification tests", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.win = document.getElementById("xml3dframe").contentWindow;
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/webgl-rendering02.html"+window.location.search, this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    },
    factory : new NotifyingAdapterFactory()
});

test("Only one element gets notified", 3, function() {

    function addAdapters(e, factory) {
        var c = e.firstElementChild;
        while(c) {
            factory.getAdapter(c);
            addAdapters(c, factory);
            c = c.nextElementSibling;
        }
    }

    var x = this.doc.getElementById("xml3DElem");
    this.factory.getAdapter(x);
    addAdapters(x, this.factory);
    var img = this.doc.getElementById("tex1img");
    img.setAttribute("src", "textures/magenta.png");
    this.win.XML3D.flushDOMChanges();
});

module("Typed array notification tests", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/basic.html", this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    },
    factory : new NotifyingAdapterFactory()
});


test("DOMCharacterDataModified notification", 6, function() {
    // replaceWholeText not implemented in FF
    /*var index = this.doc.getElementById("indices");
    this.factory.getAdapter(index);
    index.firstChild.replaceWholeText("1 2 3");
    equal(index.value.length, 3);*/

    var pos = this.doc.getElementById("positions");
    this.factory.getAdapter(pos);
    equal(pos.value.length, 12);
    pos.textContent = pos.textContent.substr(5);
    equal(pos.value.length, 11);
    equal(this.factory.event.type, Events.VALUE_MODIFIED);

});

test("Text DOMNodeInserted notification", 8, function() {
    // 1: Found frame
    // 2: Scene loaded
    var index = this.doc.getElementById("indices");
    this.factory.getAdapter(index);
    index.appendChild(this.doc.createTextNode(" 0 1 2")); // 3: Adapter notified: Notification (type:1)
    equal(index.value.length, 9, "Length of typed array after text node has been inserted"); // 4
    equal(this.factory.event.type, Events.VALUE_MODIFIED, "Notification of type VALUE_MODIFIED"); // 5

    var pos = this.doc.getElementById("positions");
    this.factory.getAdapter(pos);
    equal(pos.value.length, 12, "Length of typed array is correct before modification");
    pos.textContent = "1 0 2"; // 6: Adapter notified: Notification (type:1)
    equal(pos.value.length, 3, "Length of typed array after textContent has been set"); // 7
});
