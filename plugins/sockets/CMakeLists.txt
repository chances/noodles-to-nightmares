cmake_minimum_required(VERSION 3.20)
project(sockets LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

link_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_library(sockets SHARED sockets.cpp)
set_target_properties(sockets PROPERTIES
    SUFFIX ".cleo"
    PREFIX ""
)

target_link_libraries(sockets PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/III.CLEO.lib" ws2_32)
