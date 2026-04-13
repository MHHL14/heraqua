<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Controller\Frontend\Products;

use Herqua\Schoenadviseur\Controller\Frontend\Products\Index;
use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Magento\Framework\App\Response\Http as HttpResponse;
use Magento\Framework\Controller\Result\Raw;
use Magento\Framework\Controller\Result\RawFactory;
use PHPUnit\Framework\TestCase;

final class IndexTest extends TestCase
{
    public function testReturnsJsonFromCache(): void
    {
        $cache = $this->createMock(ProductsCache::class);
        $cache->method('read')->willReturn([['naam' => 'A']]);

        $raw = $this->createMock(Raw::class);
        $raw->expects($this->exactly(2))->method('setHeader');
        $raw->expects($this->once())->method('setContents')
            ->with($this->callback(fn($c) => str_contains($c, '"naam":"A"')));

        $rawFactory = $this->createMock(RawFactory::class);
        $rawFactory->method('create')->willReturn($raw);

        $controller = new Index($rawFactory, $cache);
        $this->assertSame($raw, $controller->execute());
    }

    public function testReturnsEmptyArrayWhenCacheMissing(): void
    {
        $cache = $this->createMock(ProductsCache::class);
        $cache->method('read')->willReturn(null);

        $raw = $this->createMock(Raw::class);
        $raw->expects($this->once())->method('setContents')->with('[]');

        $rawFactory = $this->createMock(RawFactory::class);
        $rawFactory->method('create')->willReturn($raw);

        (new Index($rawFactory, $cache))->execute();
    }
}
