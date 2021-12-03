.PHONY: all static watch clean

COMPONENT_FILES = $(shell find components/ -type f -name '*.sola.html')
BUILD_FILES = $(patsubst components/%,build/%,$(addsuffix .js,$(basename $(basename $(COMPONENT_FILES)))))

all: $(BUILD_FILES)

$(BUILD_FILES): $(COMPONENT_FILES)
	@mkdir -p build/
	deno run --allow-read --allow-write=build/ ../compile.ts $?

clean:
	rm -rf build/*

watch:
	while inotifywait -r \
		-e close_write components/; \
		do make; done

.DEFAULT_GOAL=all
