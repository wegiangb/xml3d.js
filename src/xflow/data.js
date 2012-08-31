(function(){


/**
 * @enum {number}
 */
Xflow.DataNotifications = {
    CHANGED_NEW: 0,
    CHANGED_CONTENT: 1,
    CHANGE_SIZE: 2,
    CHANGE_REMOVED: 3
};

/**
 * @constructor
 */
var SamplerConfig = function(){
    this.filterMin = 0;
    this.filterMag = 0;
    this.filterMip = 0;
    this.wrapS = 0;
    this.wrapT = 0;
    this.wrapU = 0;
    this.textureType = 0;
    this.colorR = 0;
    this.colorG = 0;
    this.colorB = 0;
    this.generateMipMap = 0;
};
Xflow.SamplerConfig = SamplerConfig;

/**
 * @enum {number}
 */
SamplerConfig.FILTER_TYPE = {
    NONE: 0,
    REPEAT: 1,
    LINEAR: 2
};
/**
 * @enum {Number}
 */
SamplerConfig.WRAP_TYPE = {
    CLAMP: 0,
    REPEAT: 1,
    BORDER: 2
};
/**
 * @enum {Number}
 */
SamplerConfig.WRAP_TYPE = {
    TEXTURE_1D: 0,
    TEXTURE_2D: 1,
    TEXTURE_3D: 2
};



/**
 * @constructor
 */
var DataEntry = function(type){
    this._type = type;
    this._listeners = [];
    this.userData = {};
};
Xflow.DataEntry = DataEntry;

Object.defineProperty(DataEntry.prototype, "type", {
    /** @param {Xflow.BufferEntry.TYPE} v */
    set: function(v){
        throw "type is read-only";
    },
    /** @return {Xflow.BufferEntry.TYPE} */
    get: function(){ return this._type; }
});

/**
 * @param {function(Xflow.DataEntry, Xflow.DataEntry.NOTIFICATION)} callback
 */
DataEntry.prototype.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DataEntry.NOTIFICATION)} callback
 */
DataEntry.prototype.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * Type of DataEntry
 * @enum
 */
DataEntry.TYPE = {
    FLOAT: 0,
    FLOAT2 : 1,
    FLOAT3 : 2,
    FLOAT4 : 3,
    FLOAT4X4 : 10,
    INT : 20,
    INT4 : 21,
    BOOL: 30,
    TEXTURE: 40
}

/**
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Xflow.BufferEntry.TYPE} type
 * @param {Object} value
 */
var BufferEntry = function(type, value){
    Xflow.DataEntry.call(this, type);
    this._value = value;
    notifyListeners(this, Xflow.DataNotifications.CHANGED_NEW);
};
XML3D.createClass(BufferEntry, Xflow.DataEntry);
Xflow.BufferEntry = BufferEntry;


/** @param {Object} v */
BufferEntry.prototype.setValue = function(v){
    var newSize = this._value.length != v.length;
    this._value = v;
    notifyListeners(this, newSize ? Xflow.DataNotifications.CHANGE_SIZE : Xflow.DataNotifications.CHANGED_CONTENT);
}

/** @return {Object} */
BufferEntry.prototype.getValue = function(){
    return this._value;
};


/**
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Object} value
 */
var TextureEntry = function(image){
    Xflow.DataEntry.call(this, DataEntry.TYPE.TEXTURE);
    this._image = image;
    this._samplerConfig = new SamplerConfig();
    notifyListeners(this, Xflow.DataNotifications.CHANGED_NEW);
};
XML3D.createClass(TextureEntry, Xflow.DataEntry);
Xflow.TextureEntry = TextureEntry;

/** @param {Object} v */
TextureEntry.prototype.setImage = function(v){
    this._image = v;
    notifyListeners(this, Xflow.DataNotifications.CHANGED_CONTENT);
}

/** @return {Object} */
TextureEntry.prototype.getImage = function(){
    return this._image;
}

/** @return {Object} */
TextureEntry.prototype.getSamplerConfig = function(){
    return this._samplerConfig;
};


BufferEntry.prototype.getTupleSize = function() {
   if (!this._tupleSize) {
       var t = DataEntry.TYPE;
       switch (this._type) {
       case t.FLOAT:
       case t.INT:
       case t.BOOL:
           this._tupleSize = 1;
           break;
       case t.FLOAT2:
           this._tupleSize = 2;
           break;
       case t.FLOAT3:
           this._tupleSize = 3;
           break;
       case t.FLOAT4:
       case t.INT4:
           this._tupleSize = 4;
           break;
       case t.FLOAT4x4:
           this._tupleSize = 16;
           break;
       default:
           XML3D.debug.logError("Encountered invalid type: "+this._type);
           this._tupleSize = 1;
       }
   }
   return this._tupleSize;
};

var DataChangeNotifier = {
    _listeners: []
}
Xflow.DataChangeNotifier = DataChangeNotifier;

/**
 * @param {function(Xflow.DataEntry, Xflow.DataEntry.NOTIFICATION)} callback
 */
DataChangeNotifier.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DataEntry.NOTIFICATION)} callback
 */
DataChangeNotifier.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * @param {Xflow.DataEntry} dataEntry
 * @param {number, Xflow.DataNotifications} notification
 */
function notifyListeners(dataEntry, notification){
    for(var i = 0; i < dataEntry._listeners.length; ++i){
        dataEntry._listeners[i].notify(dataEntry, notification);
    }
    for(var i = 0; i < DataChangeNotifier._listeners.length; ++i){
        DataChangeNotifier._listeners[i](dataEntry, notification);
    }
};
})();