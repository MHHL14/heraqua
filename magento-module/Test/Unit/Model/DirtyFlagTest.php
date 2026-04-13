<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model;

use Herqua\Schoenadviseur\Model\DirtyFlag;
use Magento\Framework\App\CacheInterface;
use PHPUnit\Framework\TestCase;

final class DirtyFlagTest extends TestCase
{
    public function testMarkSetsFlag(): void
    {
        $cache = $this->createMock(CacheInterface::class);
        $cache->expects($this->once())->method('save')->with('1', 'herqua_products_dirty');
        (new DirtyFlag($cache))->mark();
    }

    public function testIsDirtyReadsCache(): void
    {
        $cache = $this->createMock(CacheInterface::class);
        $cache->method('load')->with('herqua_products_dirty')->willReturn('1');
        $this->assertTrue((new DirtyFlag($cache))->isDirty());
    }

    public function testIsDirtyFalseWhenMissing(): void
    {
        $cache = $this->createMock(CacheInterface::class);
        $cache->method('load')->willReturn(false);
        $this->assertFalse((new DirtyFlag($cache))->isDirty());
    }

    public function testClearRemovesFlag(): void
    {
        $cache = $this->createMock(CacheInterface::class);
        $cache->expects($this->once())->method('remove')->with('herqua_products_dirty');
        (new DirtyFlag($cache))->clear();
    }
}
