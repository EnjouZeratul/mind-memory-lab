try {
  module.exports = require("./build/Release/mindmem_native.node");
} catch {
  module.exports = null;
}
