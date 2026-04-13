<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model\Cache;

use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Magento\Framework\Filesystem;
use Magento\Framework\Filesystem\Directory\WriteInterface;
use PHPUnit\Framework\TestCase;

final class ProductsCacheTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/herqua-cache-' . uniqid();
        mkdir($this->tmpDir . '/herqua', 0777, true);
    }

    protected function tearDown(): void
    {
        $subDir = $this->tmpDir . '/herqua';
        foreach (glob($subDir . '/*') ?: [] as $f) {
            unlink($f);
        }
        if (is_dir($subDir)) {
            rmdir($subDir);
        }
        rmdir($this->tmpDir);
    }

    public function testWriteAtomic(): void
    {
        $cache = $this->buildCache();
        $cache->write([['naam' => 'Saucony', 'prijs' => 149.95]]);

        $path = $this->tmpDir . '/herqua/products.json';
        $this->assertFileExists($path);
        $this->assertFalse(file_exists($path . '.tmp'));

        $decoded = json_decode((string)file_get_contents($path), true);
        $this->assertSame('Saucony', $decoded[0]['naam']);
    }

    public function testReadReturnsNullWhenMissing(): void
    {
        $cache = $this->buildCache();
        $this->assertNull($cache->read());
    }

    public function testReadReturnsDecoded(): void
    {
        $cache = $this->buildCache();
        $cache->write([['x' => 1]]);
        $this->assertSame([['x' => 1]], $cache->read());
    }

    public function testLastModified(): void
    {
        $cache = $this->buildCache();
        $this->assertNull($cache->lastModified());
        $cache->write([]);
        $this->assertNotNull($cache->lastModified());
    }

    private function buildCache(): ProductsCache
    {
        $writer = $this->createMock(WriteInterface::class);
        $writer->method('getAbsolutePath')
            ->willReturnCallback(fn($rel) => $this->tmpDir . '/' . $rel);
        $writer->method('create')->willReturn(true);

        $filesystem = $this->createMock(Filesystem::class);
        $filesystem->method('getDirectoryWrite')->willReturn($writer);

        return new ProductsCache($filesystem);
    }
}
