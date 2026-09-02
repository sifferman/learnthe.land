// production config

// babel-loader picks its environment from BABEL_ENV/NODE_ENV. Left unset it
// falls back to "development", and @babel/preset-react's automatic runtime
// (the default since Babel 8) then emits `jsxDEV` calls — which React's
// production build deliberately does not export, so the bundle throws on load.
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const { merge } = require("webpack-merge");
const { resolve } = require("path");

const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "production",
  entry: "./index.tsx",
  output: {
    filename: "js/bundle.[contenthash].min.js",
    path: resolve(__dirname, "../../dist"),
    publicPath: "",
  },
  devtool: "source-map",
  plugins: [],
});
