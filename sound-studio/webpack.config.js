const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const isProduction = process.env.NODE_ENV === 'production';

const config = new ScratchWebpackConfigBuilder({
    rootPath: __dirname,
    enableReact: true,
    cssModuleExceptions: [/\.global\.css$/]
})
    .setTarget('web')
    .merge({
        entry: {
            app: path.resolve(__dirname, 'src/index.jsx')
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            publicPath: './',
            filename: isProduction ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
            chunkFilename: isProduction ? 'chunks/[name].[contenthash:8].js' : 'chunks/[name].js',
            assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
            clean: true
        },
        devtool: isProduction ? false : 'eval-cheap-module-source-map',
        performance: {
            hints: false
        },
        devServer: {
            host: 'localhost',
            port: 5174,
            static: false,
            devMiddleware: {
                publicPath: '/'
            },
            hot: true,
            open: false,
            client: {
                overlay: true
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|jpg|jpeg|gif|webp)$/i,
        resourceQuery: /^$/,
        type: 'asset'
    })
    .addPlugin(new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        favicon: path.resolve(__dirname, 'public/favicon.svg'),
        title: 'Sound Studio',
        inject: 'body',
        scriptLoading: 'defer',
        meta: {
            description: 'A standalone Scratch-style sound editor for the browser.',
            'theme-color': '#f7f4ee'
        }
    }));

module.exports = config.get();
