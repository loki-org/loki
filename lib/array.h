// SPDX-FileCopyrightText: 2023-present Lukas Neubert <lukas.neubert@proton.me>
// SPDX-License-Identifier: MPL-2.0

#ifndef ARRAY_H
#define ARRAY_H

#include <stdlib.h>
#include <string.h>

typedef struct {
	size_t length;
	size_t capacity;
} ArrayMeta;

#define Array(type) type*

#define Array_get_meta(arr) \
	(&((ArrayMeta*)(arr))[-1])

#define Array_from_meta(meta) \
	((void*)(&((ArrayMeta*)(meta))[1]))

#define Array_get_length(arr) \
	((arr) ? Array_get_meta(arr)->length : (size_t)0)

#define Array_get_capacity(arr) \
	((arr) ? Array_get_meta(arr)->capacity : (size_t)0)

#define Array_push(arr, elem) \
	do { \
		if (Array_get_capacity(arr) <= Array_get_length(arr)) { \
			Array_grow(arr); \
		} \
		(arr)[Array_get_length(arr)] = elem; \
		Array_get_meta(arr)->length++; \
	} while (0)

#define Array_get(arr, index) \
	(arr)[index]

#define Array_grow(arr) \
	do { \
		size_t new_len = Array_get_length(arr) + 1; \
		size_t new_size = new_len * sizeof(*(arr)) + sizeof(ArrayMeta); \
		void* new_meta = arr ? realloc(Array_get_meta(arr), new_size) : malloc(new_size); \
		arr = Array_from_meta(new_meta); \
		Array_get_meta(arr)->capacity = new_len; \
	} while (0)

#define Array_from_c_array(type, c_arr, count) \
	({ \
		size_t element_size = sizeof(type); \
		size_t init_size = (count) * element_size + sizeof(ArrayMeta); \
		void* init_meta = malloc(init_size); \
		Array(type) arr = Array_from_meta(init_meta); \
		Array_get_meta(arr)->length = count; \
		Array_get_meta(arr)->capacity = count; \
		memcpy(arr, c_arr, (count) * element_size); \
		arr; \
	})

#endif // ARRAY_H
