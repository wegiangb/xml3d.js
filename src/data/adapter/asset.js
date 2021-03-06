var DOMTransformFetcher = require("../transform-fetcher.js");
var DataAdapter = require("./data.js");
var Base = require("../../xflow/base.js");
var DataNode = require("../../xflow/interface/graph.js").DataNode;
var getComputeDataflowUrl = require("../../xflow/interface/graph.js").getComputeDataflowUrl;
var Asset = require("../../asset/asset.js").Asset;
var SubData = require("../../asset/asset.js").SubData;
var Events = require("../../interface/notification.js");
var dispatchCustomEvent = require("../../utils/misc.js").dispatchCustomEvent;
var Resource = require("../../resource");
var CSS = require("../../utils/css.js");

var NodeAdapter = require("../../base/adapter.js").NodeAdapter;
var createClass = XML3D.createClass;
var AdapterHandle = require("../../base/adapterhandle.js");


var AssetAdapter = function (factory, node) {
    NodeAdapter.call(this, factory, node);

    /**
     *  @type Asset
     **/
    this.asset = new Asset(this.node);

    if (!node.style) {
        // Node is not part of the DOM (probably an external resource) so we have to parse the style ourselves
        this.style = CSS.getComputedStyle(node);
    } else {
        this.style = window.getComputedStyle(node);
    }

    if (node.localName.toLowerCase() !== "model") {
        this.transformFetcher = new DOMTransformFetcher(this, "transform", "transform");
    }
};

createClass(AssetAdapter, NodeAdapter);

AssetAdapter.prototype.init = function () {
    this.asset.addChangeListener(this);
    this.asset.setName(this.node.getAttribute("name"));
    updateAdapterHandle(this, "src", this.node.getAttribute("src"));
    updatePickFilter(this);
    updateChildren(this);
    setMaterialUrl(this, this.asset);
    this.transformFetcher && this.transformFetcher.update();
};

AssetAdapter.prototype.onAssetLoadChange = function (asset, newLevel, oldLevel) {
    if (newLevel == Infinity) {
        dispatchCustomEvent(this.node, 'load', false, true, null);
    } else if (newLevel > oldLevel) {
        dispatchCustomEvent(this.node, 'progress', false, true, null);
    }
};

AssetAdapter.prototype.getAssetComplete = function () {
    return this.asset.getProgressLevel() == Infinity;
};
AssetAdapter.prototype.getAssetProgressLevel = function () {
    return this.asset.getProgressLevel();
};

AssetAdapter.prototype.getAsset = function () {
    return this.asset;
};

function updateChildren(adapter) {
    adapter.asset.clearChildren();
    adapter.asset.clearSubAssets();
    for (var child = adapter.node.firstElementChild; child !== null; child = child.nextElementSibling) {
        var subadapter = adapter.factory.getAdapter(child);
        if (subadapter && subadapter.getAsset) {
            adapter.asset.appendSubAsset(subadapter.getAsset());
        }
        if (subadapter && subadapter.assetEntry) {
            adapter.asset.appendChild(subadapter.assetEntry);
        }
    }
}

function updateAdapterHandle(adapter, key, url) {
    var adapterHandle = adapter.getAdapterHandle(url), status = (adapterHandle && adapterHandle.status);

    if (status === AdapterHandle.STATUS.NOT_FOUND) {
        XML3D.debug.logError("Could not find element of url '" + adapterHandle.url + "' for " + key, adapter.node);
    }
    adapter.connectAdapterHandle(key, adapterHandle);
    adapter.connectedAdapterChanged(key, adapterHandle ? adapterHandle.getAdapter() : null, status);
}

function updateAssetLoadState(dataAdapter) {
    var loading = false, handle;

    handle = dataAdapter.getConnectedAdapterHandle("src");
    if (handle && handle.status === AdapterHandle.STATUS.LOADING) {
        loading = true;
    }
    dataAdapter.asset.setLoading(loading);
}

function updatePickFilter(adapter) {
    if (!adapter.node.hasAttribute("pick"))
        adapter.asset.setPickFilter(null); else {
        var value = adapter.node.getAttribute("pick");
        adapter.asset.setPickFilter(value);
    }
}

AssetAdapter.prototype.connectedAdapterChanged = function (attributeName, adapter) {
    if (attributeName == "src")
        this.asset.setSrcAsset(adapter && adapter.getAsset() || null);
    updateAssetLoadState(this);
};

AssetAdapter.prototype.onTransformChange = function (attrName, matrix) {
    this.asset.setTransform(matrix);
};

AssetAdapter.prototype.attributeChangedCallback = function(name, oldValue, newValue) {
        switch (name) {
            case "name":
                this.asset.setName(newValue);
                break;
            case "material":
                setMaterialUrl(this, this.asset);
                break;
            case "style":
            case "transform":
                this.transformFetcher && this.transformFetcher.update();
                break;
            case "src":
                updateAdapterHandle(this, "src", newValue);
                break;
            case "pick":
                updatePickFilter(this);
                break;
        }
};


AssetAdapter.prototype.notifyChanged = function (evt) {
    if (evt.type == Events.ADAPTER_HANDLE_CHANGED) {
        this.connectedAdapterChanged(evt.key, evt.adapter);
        if (evt.handleStatus == AdapterHandle.STATUS.NOT_FOUND) {
            XML3D.debug.logError("Could not find <asset> element of url '" + evt.url + "' for " + evt.key);
        }
    } else if (evt.type == Events.NODE_INSERTED) {
        updateChildren(this);

    } else if (evt.type == Events.NODE_REMOVED) {
        updateChildren(this);

    }  else if (evt.type == Events.THIS_REMOVED) {
        this.clearAdapterHandles();
        this.asset.removeChangeListener(this);
    }
};

var AssetDataAdapter = function (factory, node) {
    this.assetData = true;
    DataAdapter.call(this, factory, node);

    // Node handles for src and proto
    this.assetEntry = null;
    this.outputXflowNode = null;
};
createClass(AssetDataAdapter, DataAdapter);

AssetDataAdapter.prototype.init = function () {
    DataAdapter.prototype.init.call(this);
    this.outputXflowNode = new AssetDataNode(false);
    this.assetEntry = new SubData(this.outputXflowNode, this.getXflowNode(), this.node);
    this.assetEntry.setName(this.node.getAttribute("name"));
    updateClassNames(this);
    updatePostCompute(this);
    this.assetEntry.setPostFilter(this.node.getAttribute("filter"));
    updateIncludes(this.assetEntry, this.node.getAttribute("includes"));
};

AssetDataAdapter.prototype.connectedAdapterChanged = function (attributeName, adapter) {
    if (attributeName == "postDataflow") {
        this.assetEntry.setPostDataflow(adapter && adapter.getXflowNode() || null);
        updateSubDataLoadState(this);
    } else {
        DataAdapter.prototype.connectedAdapterChanged.call(this, attributeName, adapter);
    }
};

AssetDataAdapter.prototype.attributeChangedCallback = function (name, oldValue, newValue) {
    DataAdapter.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
        case "name":
            this.assetEntry.setName(newValue);
            break;
        case "compute":
            updatePostCompute(this);
            break;
        case "class":
            updateClassNames(this);
            break;
        case "filter":
            this.assetEntry.setPostFilter(newValue);
            break;
        case "includes":
            updateIncludes(newValue);
            break;
    }
};

AssetDataAdapter.prototype.notifyChanged = function (evt) {
    DataAdapter.prototype.notifyChanged.call(this, evt);

};

AssetDataAdapter.prototype.onTransformChange = function (attrName, matrix) {
    this.assetEntry.setTransform(matrix);
};

function updateIncludes(assetEntry, includeString) {
    if (!includeString)
        assetEntry.setIncludes([]); else
        assetEntry.setIncludes(includeString.trim().split(/\s*,\s*/));
}

function updateClassNames(adapter) {
    var classNames = adapter.node.getAttribute("class");
    adapter.assetEntry.setClassNamesString(classNames)
}

function updatePostCompute(adapter) {
    var computeString = adapter.node.getAttribute("compute");
    var dataflowUrl = getComputeDataflowUrl(computeString);
    if (dataflowUrl) {
        updateAdapterHandle(adapter, "postDataflow", dataflowUrl);
    } else {
        adapter.disconnectAdapterHandle("postDataflow");
        updateSubDataLoadState(adapter);
    }
    adapter.assetEntry.setPostCompute(computeString);
}

function updateSubDataLoadState(dataAdapter) {
    var loading = false, handle;

    handle = dataAdapter.getConnectedAdapterHandle("postDataflow");
    if (handle && handle.status === AdapterHandle.STATUS.LOADING) {
        loading = true;
    }
    dataAdapter.assetEntry.setLoading(loading);
}


/**
 *
 * @param adapter
 * @param {Asset} dest
 */
function setMaterialUrl(adapter, dest) {
    var node = adapter.node;
    var materialURL = node.getAttribute("material");
    if (materialURL) {
        var materialAbsoluteURL = Resource.getAbsoluteURI(node.ownerDocument._documentURL || node.ownerDocument.URL, materialURL);
        dest.setMaterial(materialAbsoluteURL.toString());
    } else {
        dest.setMaterial(null);
    }
}

var AssetMeshAdapter = function (factory, node) {
    AssetDataAdapter.call(this, factory, node);
    if (!node.style) {
        // Node is not part of the DOM (probably an external resource) so we have to parse the style ourselves
        this.style = CSS.getComputedStyle(node);
    } else {
        this.style = window.getComputedStyle(node);
    }
    this.transformFetcher = new DOMTransformFetcher(this, "transform", "transform");
};
createClass(AssetMeshAdapter, AssetDataAdapter, {

    init: function () {
        AssetDataAdapter.prototype.init.call(this);
        setMaterialUrl(this, this.assetEntry);
        this.assetEntry.setMeshType(this.node.getAttribute("type") || "triangles");
        this.assetEntry.setMatchFilter(this.node.getAttribute("match"));
        this.transformFetcher.update();
        this.updateVisibility();
    },

    attributeChangedCallback: function (name, oldValue, newValue) {
        AssetDataAdapter.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
        switch (name) {
            case "material":
                setMaterialUrl(this, this.assetEntry);
                break;
            case "match":
                this.assetEntry.setMatchFilter(newValue);
                break;
            case "transform":
                this.transformFetcher.update();
                break;
            case "style":
                this.styleChangedCallback();
                break;
            case "type":
                this.assetEntry.setMeshType(newValue || "triangles")
        }
    },

    styleChangedCallback: function() {
        this.transformFetcher.update();
        this.updateVisibility();
    },

    notifyChanged: function (evt) {
        AssetDataAdapter.prototype.notifyChanged.call(this, evt);
    },

    updateVisibility: function () {
        var none = this.style.display == "none";
        this.assetEntry && this.assetEntry.setVisibility(!none);
    }
});

/**
 * This is just a small wrapper to identify Xflow nodes that were created by an Asset, eg as part of overrides
 * that need to be cleaned up later if the corresponding model tag is destroyed
 * @param isDataFlow
 * @constructor
 */
var AssetDataNode = function(isDataFlow) {
    DataNode.call(this, isDataFlow);
    this.isAssetDataNode = true;
};

Base.createClass(AssetDataNode, DataNode);

module.exports = {
    AssetAdapter: AssetAdapter, AssetMeshAdapter: AssetMeshAdapter, AssetDataAdapter: AssetDataAdapter
};
