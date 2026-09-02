// development config
const { merge } = require("webpack-merge");
const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "development",
  // webpack-dev-server injects its own client entry, so only the app entry is needed.
  entry: "./index.tsx",
  devtool: "cheap-module-source-map",
});
