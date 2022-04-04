const path = require('path');

const CompressionPlugin = require('compression-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const isDev = process.env.NODE_ENV === 'development';
const isYarn = !!~process.env.npm_execpath.indexOf('yarn');
const buildDate = Date.now();
const version = process.env.npm_package_version;
const appName = 'Pulse Smart Metering';
const appSuffix = 'ЖКХ';
const emitError = (name, text) => {
    const yarnError = new Error(text);
    yarnError.name = name;
    process.emitWarning(yarnError);
    process.exitCode = 1;
    process.kill(process.pid, 'SIGTERM');
};

if (!isYarn) {
    emitError('Yarn warning', 'Please use yarn!');
}

const supportedLocales = ['ru'];

const workerName = 'service-worker';

module.exports = {
    entry: Object.assign(
        isDev
            ? {}
            : {
                  [workerName]: path.resolve(__dirname, './src/service-worker/sw.ts'),
                  init: path.resolve(__dirname, './src/PreStartApp.ts'),
              },
        {vendor: path.resolve(__dirname, './src/index.tsx')},
    ),
    mode: isDev ? 'development' : 'production',
    watchOptions: {
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/,
    },
    devtool: isDev ? 'source-map' : false,

    output: {
        path: path.resolve(__dirname, './dist'),
        publicPath: '/',
        filename: pathData => {
            return pathData.chunk.name === workerName ? '[name].js' : `[name].[fullhash].js`;
        },
        chunkFilename: '[id].[fullhash].js',
        globalObject: 'this',
    },

    devServer: {
        compress: true,
        port: 3000,
        host: '0.0.0.0',
        open: false,
        historyApiFallback: {
            disableDotRule: true,
        },
        proxy: [
            {
                context: ['/webapp', '/nominatim'],
                target: `https://psc-dev.element-soft.com/`,
                // pathRewrite: {'^/webapp': ''},
                changeOrigin: true,
                secure: true,
            },
        ],
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },

    module: {
        rules: [
            {
                test: /\.(gif|png|jpe?g|svg)$/i,
                loader: 'file-loader',
                options: {
                    name: 'images/[name].[ext]',
                },
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                    },
                    {
                        loader: 'css-loader',
                    },
                ],
            },

            {
                test: /\.(j|mj|t)s(x)?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'thread-loader',
                        options: {
                            workers: require('os').cpus().length - 1,
                            poolTimeout: isDev ? Infinity : undefined,
                        },
                    },
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                        },
                    },
                ],
            },
        ],
    },
    optimization: {
        minimize: !isDev,
        minimizer: isDev ? [] : [new TerserPlugin()],
        moduleIds: 'deterministic',
    },
    plugins: [
        new webpack.BannerPlugin({
            banner:
                '\n' +
                '########   ######  ##     ## \n' +
                '##     ## ##    ## ###   ### \n' +
                '##     ## ##       #### #### \n' +
                '########   ######  ## ### ## \n' +
                '##              ## ##     ## \n' +
                '##        ##    ## ##     ## \n' +
                '##         ######  ##     ## \n' +
                '\n' +
                '@copyright Copyright (c) Element-soft \n',
        }),
        new webpack.DefinePlugin({
            _IS_DEV: isDev,
            _VERSION: `"${version}"`,
            _BUILD_DATE: `"${buildDate}"`,
            _SYSTEM: `"${appName}"`,
            _SYSTEM_SUFFIX: `"${appSuffix}"`,
            _UNIQUE_STATE: `"${version}_${buildDate}"`,
        }),
        new HtmlWebpackPlugin({
            title: `${appSuffix} • ${appName}`,
            filename: 'index.html',
            template: path.resolve(__dirname, './public/index.html'),
            chunksSortMode: 'none',
            excludeChunks: [workerName],
            hash: false,
        }),
        new webpack.ContextReplacementPlugin(
            /date\-fns[\/\\]/,
            new RegExp(`[/\\\\\](${supportedLocales.join('|')})[/\\\\\]`),
        ),
    ].concat(
        isDev
            ? [new ForkTsCheckerWebpackPlugin()]
            : [
                  new FaviconsWebpackPlugin({
                      logo: path.resolve(__dirname, './assets/favicon.svg'),
                      cache: true,
                      inject: true,
                      prefix: 'favicon/',
                      favicons: {
                          appName,
                          appDescription: `${appSuffix} • ${appName}`,
                          developerName: 'Element-soft',
                          lang: 'ru-RU',
                          version,
                          display: 'standalone',
                          start_url: '/?source=pwa',
                          icons: {
                              android: true,
                              appleIcon: false,
                              appleStartup: false,
                              coast: false,
                              favicons: true,
                              firefox: false,
                              windows: false,
                              yandex: false,
                          },
                      },
                  }),
                  new CompressionPlugin({
                      filename: '[path][base].br[query]',
                      algorithm: 'brotliCompress',
                      compressionOptions: {level: 11},
                  }),
              ],
    ),
};
