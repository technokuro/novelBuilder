if [ ! -d ./back ]; then
  mkdir "./back"
fi

if [ -e ./app.out ]; then
  mv ./app.out ./back/app.out`date +"%Y%m%d%H%M"`
fi
if [ -e ./app.err ]; then
  mv ./app.err ./back/app.err`date +"%Y%m%d%H%M"`
finohup node ./src/bin/www  > ./app.out 2> app.err &
