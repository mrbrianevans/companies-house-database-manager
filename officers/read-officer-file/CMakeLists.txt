cmake_minimum_required(VERSION 3.19)
project(read_officer_file C)

set(CMAKE_C_STANDARD 11)

add_executable(read_officer_file main.c main.h readFile.c readFile.h)
# the only thing stopping me from using libpq is the target x64 vs x86
target_link_libraries(read_officer_file ../libpq)
include_directories("C:/Program Files/PostgreSQL/13/include")
link_directories("C:/Program Files/PostgreSQL/13/lib")