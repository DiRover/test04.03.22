FROM fholzer/nginx-brotli:latest as psc-ui
ADD ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./dist /usr/share/nginx/html