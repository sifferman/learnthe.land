// development config

// Keep babel-loader's environment in step with the webpack mode; see prod.js.
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const { merge } = require("webpack-merge");
const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "development",
  // webpack-dev-server injects its own client entry, so only the app entry is needed.
  entry: "./index.tsx",
  devtool: "cheap-module-source-map",
});
