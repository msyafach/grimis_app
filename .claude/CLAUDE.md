1. Always use uv package manager to install and manage dependencies
2. Always do git commit after any changes and create an intuitive commit message
3. Always check which branch are we currently at, if it is main DO NOT PUSH just let the user to do that. Otherwise, push directly
4. Always give summary changes in the end of every response
5. Check using docker ps if there is container running for the respective app, after each change rebuild it, using docker compose up -d --build
6. After rebuild the container, check each container using docker logs to ensure it run smoothly
7. Always do increment development do not try to solve it at once.