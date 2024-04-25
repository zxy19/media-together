

import { Configuration } from "webpack";
import HtmlWebpackPlugin from 'html-webpack-plugin';
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";
import WorkboxPlugin from 'workbox-webpack-plugin';
import FaviconsWebpackPlugin from 'favicons-webpack-plugin';
const config: Configuration | DevServerConfiguration = {
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['index'],
            inject: 'body',

        }),
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /(.*?)\.(js|css|ts)/, // js /css /ts静态资源缓存
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'js-css-cache',
                    },
                },
                {
                    urlPattern: /(.*?)\.(png|jpe?g|svg|gif|bmp|psd|tiff|tga|eps)/, // 图片缓存
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'image-cache',
                    },
                },
            ],
        }),
        new FaviconsWebpackPlugin({
            logo: './public/logo.png',
            logoMaskable: './public/logo.png',
            mode: 'webapp',
            manifest: "./src/manifest.json",
            favicons: {
                icons: {
                    "yandex": false,
                    "android": [
                        "android-chrome-512x512.png",
                        "android-chrome-72x72.png",
                    ],
                    "appleIcon": [
                        "apple-touch-icon-precomposed.png",
                        "apple-touch-icon.png"
                    ],
                    "appleStartup": false,
                    "favicons": [
                        "favicon.ico"
                    ],
                    "windows": [
                        "mstile-310x310.png",
                        "mstile-70x70.png"
                    ]
                }
            }
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: "babel-loader",
                    options: { presets: ["@babel/preset-env", "@babel/preset-typescript"] },
                },
                exclude: "/node-modules/"
            }, {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }, {
                test: /\.html$/i,
                loader: "html-loader",
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        extensionAlias: { ".js": [".ts", ".js"] }
    },
    output: {
        filename: "[name].[chunkhash].bundle.js",
        path: __dirname + "/dist",
        globalObject: 'this',
    },
    devServer: {
        static: {
            directory: __dirname + '/public',
        },
        watchFiles: ['src/**/*.*', 'public/**/*'],
        compress: true,
        port: 9000,
    },
    entry: {
        index: ["./src/index.ts", "./src/index.html"],
    }
};

export default config;