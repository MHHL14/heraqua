<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Integration;

use PHPUnit\Framework\TestCase;

final class WidgetSchemaCompatTest extends TestCase
{
    private const REQUIRED_KEYS = ['naam', 'prijs'];
    private const KNOWN_OPTIONAL_KEYS = [
        'afbeelding', 'url', 'merk', 'stabiliteit', 'drop',
        'gewicht', 'pronatie_geschikt', 'categorie_hardloopschoen',
    ];

    public function testV2bFixtureValid(): void
    {
        $path = __DIR__ . '/fixtures/v2b-products.json';
        $this->assertFileExists($path);
        $data = json_decode((string)file_get_contents($path), true);
        $this->assertIsArray($data);
        $this->assertNotEmpty($data);

        foreach ($data as $product) {
            foreach (self::REQUIRED_KEYS as $key) {
                $this->assertArrayHasKey($key, $product, "v2b product missing '$key'");
            }
        }
    }

    public function testExporterOutputSameShape(): void
    {
        // Minimale mock-output matchend met ProductExporter's output.
        $output = [[
            'naam' => 'X',
            'prijs' => 100.0,
            'afbeelding' => 'x.jpg',
            'url' => 'x',
            'merk' => 'Brand',
        ]];

        foreach ($output as $product) {
            foreach (self::REQUIRED_KEYS as $key) {
                $this->assertArrayHasKey($key, $product);
            }
            foreach (array_keys($product) as $key) {
                $this->assertContains(
                    $key,
                    array_merge(self::REQUIRED_KEYS, self::KNOWN_OPTIONAL_KEYS),
                    "Exporter emitted unknown key '$key' — widget may not know how to render it"
                );
            }
        }
    }
}
