cmake_minimum_required(VERSION 3.19)
project(read_officer_file C)

set(CMAKE_C_STANDARD 11)

add_executable(read_officer_file main.c readFile.c readFile.h main.h)
# this is a nightmare, can't load libpq library