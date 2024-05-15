# Actionfile.toml

Makefile/Taskfile alternative without the hassle. It aims to be very easy to use.

### Install

```bash
npm install -g actionfile
```

### Usage

Actionfile.toml

```toml
[hello_world]
  cmd = "echo 'Hello, World!'"
  silent = true # Turn this on if you don't wanna see logs from Actionfile it self
```

```bash
action hello_world
```

Output: Hello World!

### Using Environment Variables

```toml
[env]
 path = "./env"
```

```toml
[hello_world]
  cmd = "echo 'Hello, $NAME!'" # Loads the NAME variable from the env file
  silent = true # Turn this on if you don't wanna see logs from Actionfile it self
```

Output: Hello, John!

## Features

- Deps (SOON)
  deps: <cmd> -- A command needs to be run first before "a" can be ran

````

### Common Errors Right Now

When using --watch in bun for example or nodemon, you might get this error if you are running a server:

```bash
Error: listen EADDRINUSE: address already in use :::3000
````

I'm working on a fix for this. For now, you can just kill the process and run the command again.
