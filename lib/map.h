// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

#ifndef MAP_H
#define MAP_H

#include <stddef.h>

#define MAX_CAPACITY 100

typedef struct Entry {
	char* key;
    void* value;
	struct Entry* next;
} Entry;

typedef struct Map {
	Entry *buckets[MAX_CAPACITY];
} Map;

Map *new_Map();

void Map_insert(Map *map, const char *key, void* value);

void* Map_get(Map *map, const char *key);

int Map_remove_key(Map *map, const char *key);

void Map_free(Map *map);

#endif // MAP_H
