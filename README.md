# Actionfile

Makefile alternative without the hassle. It aims to be very easy and fun to use.

If you don't know what Makefile is, it's a tool that allows you to define a set of tasks that you can run from the command line.

### Install

```bash
npm install -g actionfile
```

### Usage

actionfile.toml

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
