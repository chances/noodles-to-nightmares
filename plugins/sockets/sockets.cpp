/**
 * @file sockets.cpp
 * @brief CLEO UDP Sockets Plugin for GTA III.
 *
 * Exposes opcode 0B30 to stream real-time player telemetry and capture events
 * over a non-blocking UDP datagram socket to localhost without game hitches.
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>

#pragma comment (lib, "III.CLEO.lib")
#pragma comment (lib, "ws2_32.lib")
#include "III.CLEO.h"

#define CLEO_VERSION_MAIN    2
#define CLEO_VERSION_MAJOR   1
#define CLEO_VERSION_MINOR   0

#define CLEO_VERSION ((CLEO_VERSION_MAIN << 24)|(CLEO_VERSION_MAJOR << 16)|(CLEO_VERSION_MINOR << 8))

/** Pointer to CLEO shared parameter buffer holding collected opcode arguments. */
static tScriptVar *Params;

/** Global non-blocking UDP socket handle used for outbound telemetry. */
static SOCKET g_udpSocket = INVALID_SOCKET;

/**
 * @brief Opcode 0B30: Transmit player telemetry or capture event via UDP.
 *
 * Script signature:
 *   0B30: port (int), x (float), y (float), z (float), heading (float), event (int)
 *
 * Formats and transmits a non-blocking UDP packet to 127.0.0.1:<port>:
 *   - event == 1: "CAPTURE:<x>,<y>,<z>,<h>"
 *   - event == 0: "POS:<x>,<y>,<z>,<h>"
 *
 * @param script Pointer to calling CScript thread context.
 * @return eOpcodeResult Execution status code (OR_CONTINUE to proceed).
 */
eOpcodeResult WINAPI OPCODE_0B30(CScript *script)
{
    // Collect 6 opcode parameters from the calling script's instruction pointer
    script->Collect(6);

    const int port = Params[0].nVar;
    const float x = Params[1].fVar;
    const float y = Params[2].fVar;
    const float z = Params[3].fVar;
    const float h = Params[4].fVar;
    const int eventType = Params[5].nVar;

    if (g_udpSocket != INVALID_SOCKET) {
        char buf[128];
        if (eventType == 1) {
            snprintf(buf, sizeof(buf), "CAPTURE:%.3f,%.3f,%.3f,%.2f", x, y, z, h);
        } else {
            snprintf(buf, sizeof(buf), "POS:%.3f,%.3f,%.3f,%.2f", x, y, z, h);
        }

        sockaddr_in dest;
        dest.sin_family = AF_INET;
        dest.sin_port = htons((unsigned short)port);
        dest.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // 127.0.0.1

        sendto(g_udpSocket, buf, (int)strlen(buf), 0, (sockaddr*)&dest, sizeof(dest));
    }

    return OR_CONTINUE;
}

/**
 * @brief Standard Win32 DLL entry point for CLEO plugin lifecycle.
 *
 * - DLL_PROCESS_ATTACH: Verifies CLEO version, initializes WinSock2, sets the UDP socket
 *   to non-blocking mode (FIONBIO), resolves the CLEO param buffer, and registers opcode 0B30.
 * - DLL_PROCESS_DETACH: Cleans up the UDP socket and shuts down WinSock.
 */
BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        if (CLEO_GetVersion() < CLEO_VERSION)
        {
            return FALSE;
        }

        // Initialize WinSock2
        WSADATA wsa;
        if (WSAStartup(MAKEWORD(2, 2), &wsa) == 0)
        {
            g_udpSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
            if (g_udpSocket != INVALID_SOCKET)
            {
                // Put socket into non-blocking mode so sendto never blocks the game loop
                u_long nonBlocking = 1;
                ioctlsocket(g_udpSocket, FIONBIO, &nonBlocking);
            }
        }

        // Cache shared parameter pointer and register opcode 0B30
        Params = CLEO_GetParamsAddress();
        Opcodes::RegisterOpcode(0x0B30, OPCODE_0B30);
    }
    else if (reason == DLL_PROCESS_DETACH)
    {
        if (g_udpSocket != INVALID_SOCKET)
        {
            closesocket(g_udpSocket);
            g_udpSocket = INVALID_SOCKET;
        }
        WSACleanup();
    }
    return TRUE;
}
