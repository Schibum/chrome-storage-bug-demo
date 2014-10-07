'use strict';

/**
* @constructor
*/
var FillFsDemo = function() {
  this.blob_ = null;
  this.started_ = false;
};


(function() {
  function log(text) {
    console.log(text);
    var logEl = document.getElementById('log');
    logEl.innerHTML += text + '\n';
    logEl.scrollTop = logEl.scrollHeight;
  }

  var errorHandler = function(text) {
    console.error(text);
    log('Error: ' + text);
  };

  function createBlob(sizeMb) {
    var buf = new ArrayBuffer(1024 * 1024);
    var arr = [];
    for (var i = 0; i < sizeMb; ++i) {
      arr.push(buf);
    }
    return new Blob(arr, {type: 'application/octet-stream'});
  }

  /**
   * @param {number|string} bytes
   * @return {string} string with thousands separators.
   */
  function formatBytes(bytes) {
    return String(bytes).split('').reverse().join('')
      .match(/.{1,3}/g).join(',').split('').reverse().join('');
  }

  var pro = FillFsDemo.prototype;

  pro.init = function() {
    // Note: size does not matter with unlimitedStorage permission
    this.blob_ = createBlob(100);
    this.initFs_();

    this.startButton_ = document.getElementById('start_button');
    this.stopButton_ = document.getElementById('stop_button');
    this.bytesWrittenEl_ = document.getElementById('bytes_written');
    this.bytesUsageEl_ = document.getElementById('bytes_usage');
    this.bytesQuotaEl_ = document.getElementById('bytes_quota');
    this.startButton_.addEventListener('click', this.onStartClick_.bind(this), false);
    this.stopButton_.addEventListener('click', this.onStopClick_.bind(this), false);
    document.getElementById('delete_button')
      .addEventListener('click', this.removeFile_.bind(this), false);

    this.updateQuota_();
  };

  pro.initFs_ = function() {
    log('requesting filesystem');
    window.webkitRequestFileSystem(window.PERSISTENT, 1024 * 1024,
      this.onInitFs_.bind(this), errorHandler);
  };

  pro.onStartClick_ = function() {
    this.started_ = true;
    this.writeChunk_();
  };

  pro.onStopClick_ = function() {
    this.started_ = false;
    this.fileWriter_.abort();
    log('aborted file writer');
    this.updateQuota_();
    this.updateFileSize_();
  };

  pro.updateQuota_ = function() {
    return new Promise(function(resolve) {
      navigator.webkitPersistentStorage.queryUsageAndQuota(function(usage, quota) {
        log('Storage usage: ' + formatBytes(usage) + ', quota: ' + formatBytes(quota));
        this.bytesUsageEl_.innerText = formatBytes(usage);
        this.bytesQuotaEl_.innerText = formatBytes(quota);
        resolve();
      }.bind(this), errorHandler);
    }.bind(this));
  };

  pro.updateFileSize_ = function() {
    log('file size: ' + formatBytes(this.fileWriter_.length));
    this.bytesWrittenEl_.innerText = formatBytes(this.fileWriter_.length);
  };

  pro.onWrite_ = function() {
    console.timeEnd('write');
    this.updateFileSize_();
    this.updateQuota_().then(function() {
      if (this.started_)
        this.writeChunk_();
    }.bind(this));
  };

  pro.removeFile_ = function() {
    log('removing file..');
    this.bytesWrittenEl_.innerText = 0;
    this.fileEntry_.remove(function() {
      log('File removed.');
      this.updateQuota_();
      this.initFs_();
    }.bind(this), errorHandler);
  };

  pro.onFileWriterCreated_ = function(fileWriter) {
    fileWriter.onwrite = this.onWrite_.bind(this);
    fileWriter.onerror = function() {
      log('Write failed');
    };
    fileWriter.seek(fileWriter.length);
    this.fileWriter_ = fileWriter;
    this.updateFileSize_();
    log('ready');
  };


  pro.writeChunk_ = function() {
    log('writing chunk of size ' + formatBytes(this.blob_.size));
    console.time('write');
    this.fileWriter_.write(this.blob_);
  };

  pro.onInitFs_ = function(fs) {
    log('got file system');
    fs.root.getFile('big.bin', {create: true}, function(fileEntry) {
      log('opened file');
      this.fileEntry_ = fileEntry;
      fileEntry.createWriter(this.onFileWriterCreated_.bind(this), errorHandler);
    }.bind(this), errorHandler);
  };

})();

var fillFsDemo = new FillFsDemo();
fillFsDemo.init();
