// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

// Example must look like:
// int main() {
// 	Map* m = new_Map();
// 	Map_insert(m, "foo", (int*)1);
// 	Map_insert(m, "bar", (int*)3);
// 	Map_insert(m, "foo", (int*)2);
// 	int x = (int)(__intptr_t)Map_get(m, "foo");
// 	printf("%d\n", x);
// 	Map_free(m);
// }

#ifndef MAP_H
#define MAP_H

#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_CAPACITY 100

typedef struct Entry {
	char* key;
    void* value;
	struct Entry* next;
} Entry;

typedef struct Map {
	Entry *buckets[MAX_CAPACITY];
} Map;

unsigned int hash(const char *key) {
	unsigned int hash = 0;
	while (*key) {
		hash = (hash * 31) + *key;
		key++;
	}
	return hash % MAX_CAPACITY;
}

Map *new_Map() {
	Map *map = (Map *)malloc(sizeof(Map));
	memset(map->buckets, 0, sizeof(map->buckets));
	return map;
}

void Map_insert(Map* map, const char* key, void* value) {
	unsigned int index = hash(key);

	Entry* newEl = (Entry*)malloc(sizeof(Entry));
	newEl->key = strdup(key);
	newEl->value = value;
	newEl->next = map->buckets[index];
	map->buckets[index] = newEl;
}

void* Map_get(Map *map, const char *key) {
	unsigned int index = hash(key);

	Entry* current = map->buckets[index];
	while (current) {
		if (strcmp(current->key, key) == 0) {
			return current->value;
		}
		current = current->next;
	}

	return NULL;
}

int Map_remove_key(Map *map, const char *key) {
	unsigned int index = hash(key);
	Entry *prev = NULL;
	Entry *current = map->buckets[index];

	while (current != NULL) {
		if (strcmp(current->key, key) == 0) {
			if (prev == NULL) {
				map->buckets[index] = current->next;
			} else {
				prev->next = current->next;
			}
			free(current->key);
			free(current);
			return 1; // Success
		}
		prev = current;
		current = current->next;
	}

	return -1; // Key not found
}

void Map_free(Map *map) {
	for (int i = 0; i < MAX_CAPACITY; i++) {
		Entry *entry = map->buckets[i];
		while (entry != NULL) {
			Entry *temp = entry;
			entry = entry->next;
			free(temp->key);
			free(temp);
		}
	}
	free(map);
}


#endif // MAP_H
